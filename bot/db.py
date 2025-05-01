from sqlalchemy import (
    create_engine,
    Column,
    String,
    SmallInteger,
    Text,
    TIMESTAMP,
)
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Create the engine
engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)


# Modern Base class
class Base(DeclarativeBase):
    pass


# Create a session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class User(Base):
    __tablename__ = "our_user"

    t_user_id = Column(String(100), primary_key=True)
    t_name = Column(Text)
    ig_user_name = Column(String(255))
    ig_password = Column(String(255))
    ig_user_id = Column(String(100))
    ig_status = Column(SmallInteger)  # state of user ig account
    authority_code = Column(Text)
    payment_status = Column(SmallInteger, default=0)  # default is 0 (inactive payment status)
    paid_time = Column(TIMESTAMP)
    user_status = Column(SmallInteger)  # user state in our site

    def __repr__(self):
        return f"<OurUser(t_user_id={self.t_user_id}, t_name={self.t_name}, ig_user_name={self.ig_user_name})>"


class IgSession(Base):
    __tablename__ = "ig_sessions"

    ig_user_id = Column(String(100), primary_key=True)
    ig_user_name = Column(String(255), nullable=False)
    ig_password = Column(String(255), nullable=False)
    session_state = Column(SmallInteger, nullable=False)
    file_address = Column(String(255))
    last_report = Column(TIMESTAMP)
    error_counter = Column(SmallInteger, default=0)

    def __repr__(self):
        return f"<IgSession(ig_user_id={self.ig_user_id}, ig_user_name={self.ig_user_name})>"


def get_db():
    """
    Function to get a database session.
    Returns a session object that can be used to query the database.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
