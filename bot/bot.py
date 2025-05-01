from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
    CallbackQueryHandler,
    ConversationHandler,
)
from db import get_db, User, IgSession
import logging
import datetime
import jwt
import re
from random import randint
from sqlalchemy import or_, update
from dotenv import load_dotenv
import os
import requests
import asyncio
import threading
import time

# Load environment variables from .env file
load_dotenv()

# ===================================================================================================
TOKEN = os.getenv("TELEGRAM_TOKEN")

application = Application.builder().token(TOKEN).build()


# Admin Info
ADMIN_PV = os.getenv("ADMIN_PV")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

# Global Variables
LIVE_URL = os.getenv("FRONTEND_URL")
SECRET_KEY = os.getenv("JWT_SECRET")
ig_username = ""
ig_password = ""
counter = ""

# Stages of the conversation
(
    START,
    GET_SUBSCRIPTION,
    CHECK_SUBSCRIPTION,
    CONNECT_INSTAGRAM,
    CHECK_INSTAGRAM_CREDENTIALS,
    GET_INSTAGRAM_TOKEN,
    CHECK_INSTAGRAM_TOKEN,
    EXTERACT_CHECK_INSTAGRAM_TOKEN,
    MAIN_MENU,
    EXTERACT_MAIN_MENU,
    LIVE_EXPLORER,
    EXTERACT_LIVE_EXPLORER,
) = range(12)
ADMIN_AUTHORITY, ASK_CLIENT_CODE, ASK_DURATION, SET_DURATION = range(4)

# Get a database session
db = next(get_db())

# ----------------------------------- Utilities  ------------------------------------------
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)


def generate_jwt(telegram_id):
    payload = {
        "telegram_id": telegram_id,
        "exp": datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=3),
        "iat": datetime.datetime.now(datetime.UTC),
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token


# --------------------------------- Sesson Interval ---------------------------------------
lock = threading.Lock()


async def check_sesson():
    try:
        while True:
            logger.info("Session checker started...")
            sessions = (
                db.query(IgSession)
                .filter(
                    or_(IgSession.error_counter == 2, IgSession.session_state == 4),
                )
                .all()
            )
            if len(sessions) == 0:
                return

            for session in sessions:
                user = db.query(User).filter(User.ig_user_id == session.ig_user_id).first()

                if not user:
                    logger.warning(f"No user found for igUserId: {session.ig_user_id}")
                    continue

                if user.ig_status == 1:
                    continue

                stmt = update(User).where(User.ig_user_id == session.ig_user_id).values(ig_status=1)

                keyboard = [
                    [
                        InlineKeyboardButton(
                            "✅ من مشکل را حل کردم",
                            callback_data=f"check_{user.t_user_id}",
                        )
                    ]
                ]
                reply_markup = InlineKeyboardMarkup(keyboard)

                with lock:
                    await application.bot.send_message(
                        chat_id=user.t_user_id,
                        text="❌ اکانت اینستاگرام شما با مشکل مواجه شده است. لطفاً بررسی کنید و در صورت رفع مشکل، روی دکمه زیر کلیک کنید. 🔄",
                        reply_markup=reply_markup,
                    )
                    logger.info(f"Notification sent to user {user.t_user_id}")

                # Execute the statement
                db.execute(stmt)
                db.commit()
                logger.info(f"Updated ig_status for user {user.t_user_id}")

            time.sleep(1 * 60)
    except KeyboardInterrupt:
        logger.info("Exiting program...")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)


def between_callback():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    loop.run_until_complete(check_sesson())
    loop.close()


# ------------------------------ Admin Conversation --------------------------------------
async def admin_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    logger.info(f"Admin command triggered by user: {update.message.from_user.id}")
    await update.message.reply_text(
        "برای وصل کردن حساب ادمین، لطفاً یوزرنیم و پسورد را به صورت زیر ارسال کنید:\n" "username:password",
    )
    return ADMIN_AUTHORITY


async def check_admin_authority(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        credentials = update.message.text.split(":")
        username, password = credentials

        logger.info(f"Admin login attempt by user: {update.message.from_user.id}")

        if username != ADMIN_USERNAME or password != ADMIN_PASSWORD:
            logger.warning(f"❌ Failed login attempt by user: {update.message.from_user.id}")
            await update.message.reply_text("❌ یوزرنیم یا پسورد اشتباه است!")
            return ConversationHandler.END

        keyboard = [
            [InlineKeyboardButton("یک ماهه - 100 هزار تومان", callback_data="subscribe_1")],
            [InlineKeyboardButton("دو ماهه - 150 هزار تومان", callback_data="subscribe_2")],
            [InlineKeyboardButton("سه ماهه - 200 هزار تومان", callback_data="subscribe_3")],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_text("لطفاً اشتراک مورد نظر خود را انتخاب کنید:", reply_markup=reply_markup)
        return ASK_DURATION
    except Exception as e:
        logger.error(f"❌ Error in check_admin_authority: {e}", exc_info=True)
        return ConversationHandler.END


async def select_duration(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()

    subscription_mapping = {
        "subscribe_1": 30,
        "subscribe_2": 60,
        "subscribe_3": 90,
    }

    context.user_data["subscription_days"] = subscription_mapping[query.data]
    logger.info(f"User {query.from_user.id} selected {context.user_data['subscription_days']} days subscription")

    await query.message.reply_text("لطفا کد پیگیری کاربر را وارد کنید:")
    return ASK_CLIENT_CODE


async def check_client_code(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        user_tel_id = update.message.text.split(":")[1]
        user = db.query(User).filter(User.t_user_id == str(user_tel_id)).first()

        if not user:
            user = User(
                t_user_id=str(user_tel_id),
                ig_status=0,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        subscription_days = context.user_data["subscription_days"]

        if user.paid_time is None:
            user.paid_time = datetime.datetime.now(datetime.UTC)

        expiration_time = user.paid_time + datetime.timedelta(days=subscription_days)
        expiration_time_naive = expiration_time.replace(tzinfo=None)
        user.paid_time = max(datetime.datetime.now(), expiration_time_naive)
        user.payment_status = subscription_days

        db.commit()

        logger.info(f"✅ Subscription {subscription_days} days activated for {user_tel_id}")
        await update.message.reply_text(f"✅ اشتراک {subscription_days} روزه برای {user_tel_id} ثبت شد!")
    except Exception as e:
        logger.error(f"❌ Error in check_client_code: {e}", exc_info=True)
        await update.message.reply_text("❌ خطایی رخ داد. لطفاً دوباره تلاش کنید.")

    return ConversationHandler.END


#! ------------------------------ Command Handlers --------------------------------------
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.info("Executing help_command for user: %s", update.message.from_user.id)
    help_text = (
        "✨ خوش آمدید به ربات لایو اکسپلور! 🌟\n\n"
        "با این ربات می‌توانید لایوهای اینستاگرام رو مشاهده کنید. مراحل زیر رو دنبال کنید:\n\n"
        "1️⃣ برای خرید اشتراک به ادمین پیام  داده و اشتراک خریداری کنید.\n"
        "2️⃣ سپس اکانت اینستاگرام خود را به ربات وصل کنید.\n"
        "3️⃣ حالا می‌توانید لایوها رو جستجو کنید و از تماشای آن‌ها لذت ببرید! 🎥🎉\n\n"
        "همین حالا شروع کنید و لذت ببرید! 😊\n\n"
        "تو مراحل وصل کردن اینستاگرام خود به این نکات توجه داشته باشید:\n\n"
        "1.	در صورتی که احراز هویت دو مرحله روی اکانت اینستاگرام خود فعال نکرده اید لازم است آن را از آدرس setting>Accounts Centre>Password and security>Two-factor authentication فعال کنید. حتما باید روی حالت استفاده از authenticator باشد و لطفا ان را روی ارسال پیامک قرار ندهید. (چون در ایران گاهی اوقات ارسال پیامک با مشکل مواجه میشود)\n\n"
        "2.	ممکن در طول مراحل نیاز شود به برنامه اینستاگرام خود رفته و گزینه it was me را انتخاب کنید. (در این حالت با بازگشت به قسمت وصل کردن اینستاگرام و وارد کردن یوزرنیم و پسورد می تونید از لایو گردی خود لذت ببرید)\n\n"
        "3.	ممکن است اینستاگرام به صورت بازه ای به اکانت ها شک کند و درخواست تایید هویت را برای اکانت ها ارسال کند. لطفا اکانت های خود را چک بکنید."
    )
    await update.message.reply_text(help_text)


#! ------------------------------ Main Conversation --------------------------------------
async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    logger.info("Executing start_command for user: %s", update.message.from_user.id)
    keyboard = [
        [InlineKeyboardButton("خرید اشتراک", callback_data="get_subscription")],
    ]

    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        "سلام! به ربات لایو اکسپلور خوش آمدید! 🎉\n\n"
        "برای دسترسی به تنظیمات و راهنما، لطفاً از آیکون سه خط در پایین سمت چپ تلگرام استفاده کنید.\n\n"
        "برای ادامه کار لطفا ابتدا اشتراک خود را فعال کنید.",
        reply_markup=reply_markup,
    )
    return GET_SUBSCRIPTION


# ------------------------------ Get Subscription --------------------------------------
async def get_subscription(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        telegram_user_id = update.callback_query.from_user.id
        logger.info("Executing get_subscription for user: %s", telegram_user_id)
        keyboard = [
            [
                InlineKeyboardButton(
                    "بررسی تایید ادمین",
                    callback_data=f"subscription_check_{telegram_user_id}",
                )
            ],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.callback_query.message.reply_text(
            "💳 برای خرید اشتراک، لطفاً به صفحه شخصی ادمین مراجعه کنید و حتماً کد پیگیری را به همراه داشته باشید 😊\n\n"
            f"🔗 صفحه ادمین: {ADMIN_PV}\n"
            f"🔑 کد پیگیری شما: 2025:{telegram_user_id}:{randint(100000,1000000)}\n",
            reply_markup=reply_markup,
        )
        return CHECK_SUBSCRIPTION
    except Exception as e:
        logger.error("Error in get_subscription for user %s: %s", update.callback_query.from_user.id, e)


async def check_subscription(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    telegram_user_id = update.callback_query.data.split("_")[2]
    logger.info("Checking Subscription for user %s ", telegram_user_id)
    user = db.query(User).filter(User.t_user_id == telegram_user_id).first()

    if not user:
        logger.warning("User with Telegram user ID %s not found in the database.", telegram_user_id)
        await update.callback_query.message.reply_text("اکانت شما هنوز تایید نشده.\n")
    else:
        if user.ig_user_name and user.ig_password:
            logger.info("Instagram credentials are present for user %s. Sending user to main menu...", telegram_user_id)
            keyboard = [[InlineKeyboardButton("منو اصلی", callback_data="main_menu")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.callback_query.message.reply_text(
                "برای رفتن به منوی اصلی رو دکمه زیر کلیک کنید.\n",
                reply_markup=reply_markup,
            )
            return MAIN_MENU
        else:
            logger.info("Instagram credentials missing for user %s. Redirecting to Instagram connection.", telegram_user_id)

            keyboard = [[InlineKeyboardButton("وصل کردن اینستاگرام", callback_data="connect_instagram")]]
            reply_markup = InlineKeyboardMarkup(keyboard)

            await update.callback_query.message.reply_text(
                "برای استفاده از ربات لطفا اکانت اینستاگرام خود را وصل کنید.\n",
                reply_markup=reply_markup,
            )
            return CONNECT_INSTAGRAM


# ------------------------------ Instagram connection process --------------------------------------
async def connect_instagram(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        await update.callback_query.answer()

        telegram_user_id = update.callback_query.from_user.id
        logger.info("User %s is attempting to connect Instagram.", telegram_user_id)
        user = db.query(User).filter(User.t_user_id == str(telegram_user_id)).first()

        if not user:
            await update.callback_query.message.reply_text("لطفاً ابتدا از بخش start اشتراک خود را خریداری کنید.")
            return GET_SUBSCRIPTION

        await update.callback_query.message.reply_text(
            "برای وصل کردن حساب اینستاگرام خود، لطفاً یوزرنیم و پسورد را به صورت زیر ارسال کنید:\n"
            "username:password\n\n"
            "مثال: your_username:your_password\n\n"
            "⚠️ دقت کنید که اطلاعات خود را به درستی وارد کنید تا اتصال به درستی انجام شود.",
        )
        return CHECK_INSTAGRAM_CREDENTIALS
    except Exception as e:
        logger.error("Error in connect_instagram for user %s: %s", update.callback_query.from_user.id, e)


async def check_instagram_credentials(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        global ig_password, ig_username, counter
        credentials = update.message.text.split(":")
        telegram_user_id = update.message.from_user.id

        if len(credentials) != 2:
            logger.warning("User %s entered incorrect format for credentials.", telegram_user_id)
            await update.message.reply_text(
                "❌ فرمت نادرست! لطفاً اطلاعات را به صورت username:password ارسال کنید.",
            )
            return CHECK_INSTAGRAM_CREDENTIALS

        ig_username, ig_password = credentials
        pattern = r"^[a-zA-Z0-9._]{1,30}$"
        if not bool(re.match(pattern, ig_username)):
            logger.warning("User %s entered invalid username or password.", telegram_user_id)
            await update.message.reply_text("❌ یوزرنیم یا پسورد نادرست است. لطفاً دوباره وارد کنید.")
            return CHECK_INSTAGRAM_CREDENTIALS

        # Call your API endpoint to check the status
        logger.info("User %s is attempting to register Instagram credentials.", telegram_user_id)
        response = requests.put(
            f"http://localhost:3085/api/v1/new-session",
            json={"igPassword": ig_password, "igUserName": ig_username},
            timeout=60,
        )
        response_data = response.json()

        if response.status_code == 201:
            logger.info("Instagram account successfully registered for user %s.", telegram_user_id)

            ig_user_id = response_data["data"]["igUserId"]

            user = db.query(User).filter(User.t_user_id == str(telegram_user_id)).first()
            user.t_name = update.message.from_user.full_name
            user.ig_user_name = ig_username
            user.ig_password = ig_password
            user.ig_user_id = ig_user_id
            db.commit()
            db.refresh(user)

            await update.message.reply_text("✅ اکانت شما با موفقیت ثبت شد! 🎉")

            keyboard = [[InlineKeyboardButton("منو اصلی", callback_data="main_menu")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(
                "برای رفتن به منوی اصلی رو دکمه زیر کلیک کنید.\n",
                reply_markup=reply_markup,
            )
            return MAIN_MENU
        elif response.status_code == 206:
            logger.info("Instagram send a token for user %s.", telegram_user_id)

            counter = response_data["data"]["counter"]
            keyboard = [[InlineKeyboardButton("وارد کردن توکن", callback_data="get_instagram_token")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(
                "برای کامل شدن ثبت حساب اینستاگرام لازم است که کد تایید دو مرحله ای که اینستاگرام برای شما ارسال میکند را وارد کنید.", reply_markup=reply_markup
            )
            return GET_INSTAGRAM_TOKEN

        else:
            logger.error("Instagram registration failed for user %s: %s", telegram_user_id, response.text)
            keyboard = [
                [InlineKeyboardButton("ارسال مجدد", callback_data="connect_instagram")],
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(
                "⚠️ مشکلی به وجود امده است لطفا یوزرنیم و پسورد و اکانت اینستاگرام خود رو چک کرده و دوباره امتحان کنید.",
                reply_markup=reply_markup,
            )
            return CONNECT_INSTAGRAM

    except Exception as e:
        logger.error("Error while getting Instagram credentials for user %s: %s", update.message.from_user.id, e)
        keyboard = [
            [InlineKeyboardButton("ارسال مجدد", callback_data="connect_instagram")],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "⚠️ مشکلی به وجود امده است لطفا یوزرنیم و پسورد و اکانت اینستاگرام خود رو چک کرده و دوباره امتحان کنید.",
            reply_markup=reply_markup,
        )
        return CONNECT_INSTAGRAM


async def get_instagram_token(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        logger.info("User %s requested to enter Instagram token.", update.callback_query.from_user.id)
        await update.callback_query.message.reply_text(
            "لطفا توکن خود را وارد کنید: ",
        )
        return CHECK_INSTAGRAM_TOKEN
    except Exception as e:
        logger.error("Error while getting Instagram token for user %s: %s", update.callback_query.from_user.id, e)


async def check_instagram_token(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        global ig_username, counter
        instagram_token = update.message.text
        telegram_user_id = update.message.from_user.id

        if len(instagram_token) != 6:
            logger.info("Received invalid Instagram token from user %s.", telegram_user_id)

            keyboard = [[InlineKeyboardButton("تلاش دوباره🔄️", callback_data="get_instagram_token")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text("توکن عددی شش رقمی باید باشد❗", reply_markup=reply_markup)
            return GET_INSTAGRAM_TOKEN

        logger.info("Received Instagram token from user %s.", telegram_user_id)

        response = requests.put(
            f"http://localhost:3085/api/v1/fa",
            json={"igUserName": ig_username, "counter": counter, "verificationCode": instagram_token},
            timeout=60,
        )
        response_data = response.json()

        if response.status_code == 201:
            ig_user_id = response_data["data"]["igUserId"]
            logger.info("Token was correct. User %s registered successfully with Instagram ID: %s", telegram_user_id, ig_user_id)

            user = db.query(User).filter(User.t_user_id == str(telegram_user_id)).first()
            user.t_name = update.message.from_user.full_name
            user.ig_user_name = ig_username
            user.ig_password = ig_password
            user.ig_user_id = ig_user_id
            db.commit()
            db.refresh(user)

            await update.message.reply_text("✅ اکانت شما با موفقیت ثبت شد! 🎉")

            keyboard = [[InlineKeyboardButton("منو اصلی", callback_data="main_menu")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(
                "برای رفتن به منوی اصلی رو دکمه زیر کلیک کنید.\n",
                reply_markup=reply_markup,
            )
            return MAIN_MENU
        elif response.status_code == 206:
            logger.warning("Invalid token for user %s. Prompting re-entry.", telegram_user_id)

            keyboard = [
                [InlineKeyboardButton("تلاش دوباره🔄️", callback_data="get_instagram_token")],
                [InlineKeyboardButton("وصل کردن اینستاگرام", callback_data="connect_instagram")],
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.message.reply_text(
                "لطفا دوباره توکن را وارد کنید توکن قبلی انقضا شده است.\n"
                "اگر از درستی توکن خود مطمعن هستید لطفا ایستاگرام خود را چک کنید و در صورت دیدن پیام جدید گزینه it was me را انتخاب کنید. و بعد از گذشت سی ثانیه گزینه وصل کردن به ایستاگرام را انتخاب کنید.",
                reply_markup=reply_markup,
            )
            return EXTERACT_CHECK_INSTAGRAM_TOKEN
        else:
            counter = response_data["data"]["counter"]
            if int(counter) > 7:
                keyboard = [[InlineKeyboardButton("وصل کردن اینستاگرام", callback_data="connect_instagram")]]
                reply_markup = InlineKeyboardMarkup(keyboard)
                await update.message.reply_text("به محدودیت تعداد درخواست خورده اید لطفا بعد از چند دقیقه دوباره تلاش کنید.", reply_markup=reply_markup)
                return GET_INSTAGRAM_TOKEN

    except Exception as e:
        logger.error("Error while checking Instagram token for user %s: %s", update.message.from_user.id, e)
        keyboard = [[InlineKeyboardButton("تلاش دوباره🔄️", callback_data="get_instagram_token")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text("لطفا دوباره توکن را وارد کنید توکن قبلی انقضا شده است.", reply_markup=reply_markup)
        return GET_INSTAGRAM_TOKEN


# ------------------------------ Main Menu --------------------------------------
async def main_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        logger.info("User %s opened the main menu.", update.callback_query.from_user.id)
        keyboard = [
            [InlineKeyboardButton("لایو گردی", callback_data="live_explorer")],
            [InlineKeyboardButton("وضعیت حساب", callback_data="user_info")],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.callback_query.message.reply_text(
            "منو اصلی:\n\nبرای مشاهده راهنمای استفاده از دستور /help استفاده کنید.",
            reply_markup=reply_markup,
        )
        return EXTERACT_MAIN_MENU
    except Exception as e:
        logger.error("Error while sending main menu for user %s: %s", update.callback_query.from_user.id, e)


async def user_info(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    telegram_user_id = update.callback_query.from_user.id
    logger.info("Executing user_info for user: %s", telegram_user_id)

    user = db.query(User).filter(User.t_user_id == str(telegram_user_id)).first()
    expiration_time = user.paid_time + datetime.timedelta(days=user.payment_status)
    keyboard = [
        [InlineKeyboardButton("بازشگت به منو اصلی", callback_data="main_menu")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.callback_query.message.reply_text(
        f"🗓️ اشتراک شما تا تاریخ {expiration_time.strftime('%Y-%m-%d')} معتبر است. از تماشای لایوها لذت ببرید! 🎉",
        reply_markup=reply_markup,
    )
    return MAIN_MENU


# ------------------------------ Live Explorer --------------------------------------
async def live_explorer(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    try:
        telegram_user_id = update.callback_query.from_user.id

        logger.info("User %s is trying to access the live explorer.", telegram_user_id)
        # Check if the user exists in the database
        user = db.query(User).filter(User.t_user_id == str(telegram_user_id)).first()
        if not user:
            logger.warning("User %s not found in the database. Prompting to buy subscription.", telegram_user_id)
            await update.callback_query.message.reply_text("لطفاً ابتدا از بخش start اشتراک خود را خریداری کنید.")

        expiration_time = user.paid_time + datetime.timedelta(days=user.payment_status)
        if expiration_time < datetime.datetime.now():
            logger.info("User %s subscription expired. Asking for renewal.", telegram_user_id)
            keyboard = [[InlineKeyboardButton("خرید اشتراک", callback_data="get_subscription")]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.callback_query.message.reply_text(
                "⚠️ اشتراک شما به پایان رسیده است. لطفاً ابتدا اشتراک خود را تمدید کنید. 💳\n\n" "برای بررسی وضعیت اشتراک خود، به بخش وضعیت حساب مراجعه کنید. ⏳",
                reply_markup=reply_markup,
            )
            return GET_SUBSCRIPTION
        else:
            logger.info("User %s subscription is valid. Providing live explorer options.", telegram_user_id)
            jwt_token = generate_jwt(telegram_user_id)

            keyboard = [
                [InlineKeyboardButton("مشاهده لایوها", url=f"{LIVE_URL}?token={jwt_token}")],
                [InlineKeyboardButton("نشست جدید", callback_data="live_explorer")],
                [InlineKeyboardButton("بازشگت به منو اصلی", callback_data="main_menu")],
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            await update.callback_query.message.reply_text(
                "برای مشاهده لایو‌ها روی دکمه زیر کلیک کنید:",
                reply_markup=reply_markup,
            )
            return EXTERACT_LIVE_EXPLORER

    except Exception as e:
        logger.error("Error while processing live explorer for user %s: %s", telegram_user_id, e)


# ------------------------------ Telegram Bot Functions --------------------------------------
async def error(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    if update.message:
        await update.message.reply_text(
            "❌ متاسفانه خطایی در انجام عملیات پیش آمده است. لطفاً با زدن کامند /start از اول شروع کنید\n."
            "در صورتی که اشتراک فعال هنوز دارید دکمه بررسی تایید رو بزنید تا منو اصلی برای شما بیاید."
        )
    elif update.callback_query:
        await update.callback_query.answer()
        await update.callback_query.message.reply_text(
            "❌ متاسفانه خطایی در انجام عملیات پیش آمده است. لطفاً با زدن کامند /start از اول شروع کنید\n."
            "در صورتی که اشتراک فعال هنوز دارید دکمه بررسی تایید رو بزنید تا منو اصلی برای شما بیاید."
        )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🔧 لطفاً از دستورهای تعریف‌شده برای تعامل با ربات استفاده کنید. برای دسترسی به راهنما، از آیکون سه نقطه در پایین سمت چپ صفحه استفاده کنید. 📘"
    )


# CallbackQueryHandlers to handle button clicks
async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    query = update.callback_query
    await query.answer()

    if query.data.startswith("check_"):
        try:
            telegram_user_id = query.data.split("_")[1]
            user = db.query(User).filter(User.t_user_id == telegram_user_id).first()

            # Call your API endpoint to check the status
            logger.info("Sending request to the API for user %s to check session.", telegram_user_id)
            response = requests.put(
                f"http://localhost:3085/api/v1/new-session",
                json={"igPassword": user.ig_password, "igUserName": user.ig_user_name},
                timeout=80,
            )

            if response.status_code == 200:
                logger.info("API request successful for user %s. Updating IG status.", telegram_user_id)

                user.ig_status = 0
                db.commit()
                await query.edit_message_text(text="🎉 مشکل شما با موفقیت حل شد! از همراهی شما سپاسگزاریم.\nمیتوانید برای لایو گردی از پیام های بالاتر استفاده کنید.")
            else:
                logger.error("API request failed for user %s with status code %d.", telegram_user_id, response.status_code)
                user.ig_status = 0
                db.commit()
                await query.edit_message_text(text="⚠️ مشکل هنوز حل نشده است. لطفاً بررسی کنید و چند دقیقه دیگه مجدداً امتحان کنید.")

        except Exception as e:
            logger.error("Error while handling Instagram connection for user %s: %s", telegram_user_id, e)
            user.ig_status = 0
            db.commit()
            await query.edit_message_text(text="⚠️ مشکلی به وجود آمد. لطفاً چند دقیقه دیگه دوباره امتحان کنید.")


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text("عملیات به پایان یافت.")
    return ConversationHandler.END


# ------------------------------ Main Function --------------------------------------
def main() -> None:
    # Conversation handlers
    main_conversation_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start_command)],
        states={
            GET_SUBSCRIPTION: [CallbackQueryHandler(get_subscription, pattern="^get_subscription$")],
            CHECK_SUBSCRIPTION: [CallbackQueryHandler(check_subscription, pattern="^subscription_check_.")],
            CONNECT_INSTAGRAM: [CallbackQueryHandler(connect_instagram, pattern="^connect_instagram$")],
            CHECK_INSTAGRAM_CREDENTIALS: [MessageHandler(filters.TEXT & ~filters.COMMAND, check_instagram_credentials)],
            GET_INSTAGRAM_TOKEN: [CallbackQueryHandler(get_instagram_token, pattern="^get_instagram_token$")],
            CHECK_INSTAGRAM_TOKEN: [MessageHandler(filters.TEXT & ~filters.COMMAND, check_instagram_token)],
            EXTERACT_CHECK_INSTAGRAM_TOKEN: [
                CallbackQueryHandler(get_instagram_token, pattern="^get_instagram_token$"),
                CallbackQueryHandler(connect_instagram, pattern="^connect_instagram$"),
            ],
            MAIN_MENU: [CallbackQueryHandler(main_menu, pattern="^main_menu$")],
            EXTERACT_MAIN_MENU: [CallbackQueryHandler(user_info, pattern="^user_info$"), CallbackQueryHandler(live_explorer, pattern="^live_explorer$")],
            LIVE_EXPLORER: [CallbackQueryHandler(live_explorer, pattern="^live_explorer$")],
            EXTERACT_LIVE_EXPLORER: [CallbackQueryHandler(live_explorer, pattern="^live_explorer$"), CallbackQueryHandler(main_menu, pattern="^main_menu$")],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        allow_reentry=True,
    )

    admin_conversation_handler = ConversationHandler(
        entry_points=[CommandHandler("admin", admin_command)],
        states={
            ADMIN_AUTHORITY: [MessageHandler(filters.TEXT & ~filters.COMMAND, check_admin_authority)],
            ASK_DURATION: [CallbackQueryHandler(select_duration)],
            ASK_CLIENT_CODE: [MessageHandler(filters.TEXT & ~filters.COMMAND, check_client_code)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    # Adding Handlers
    application.add_handler(main_conversation_handler)
    application.add_handler(admin_conversation_handler)

    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("admin", admin_command))
    application.add_handler(MessageHandler(filters.TEXT, handle_message))
    application.add_handler(CallbackQueryHandler(button_handler))
    application.add_error_handler(error)

    # Start Thread for Sessons
    t = threading.Thread(target=between_callback)
    t.start()

    # Poll the bot
    logger.info("Polling...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
