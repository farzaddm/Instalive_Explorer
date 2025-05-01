import { Box, Flex, Heading, Spinner, Text } from "@chakra-ui/react";
import { useEffect, useReducer, useState } from "react";
import ButtonGroupFilter from "./ButtonGroupFilter";
import RefreshIcon from "./RefreshIcon";
import ButtonFilter from "./ButtonFilter";
import ImageList from "./ImageList";
import ActionBar from "./ActionBar";
import Paging from "./Paging";
import { toaster, Toaster } from "./ui/toaster";
import useSession from "./hook/useSession";
import ExtendSessionDialog from "./ExtendSessionDialog";
import UserInfo from "./UserInfo";
import UserListDialog from "./UserListDialog";
import {
  useLive,
  useLiveLike,
  useLogin,
  usePrivateLive,
  usePublicLive,
} from "./http/useHttp";

const initialState = {
  lastRefresh: Date.now(),
  activeButton: "all",
  userName: "",
  paidTime: Date.now(),
  optionalFilter: "",
  selectMode: {
    liveUserId: "",
    liveUserName: "",
    liveFullName: "",
    liveBroadcastId: "",
  },
  page: 1,
  expiredSession: false,
  isLoading: false,
  userListDialog: false,
  isLogged: false,
  listOfImage: [],
};

function reducer(state, action) {
  switch (action.type) {
    case "LOGIN":
      return {
        ...state,
        isLogged: true,
        userName: action.payload.name,
        paidTime: action.payload.paidTime,
      };

    case "TOGGLE_USERLIST_DIALOG":
      return { ...state, userListDialog: !state.userListDialog };

    case "TOGGLE_LOADING":
      return { ...state, isLoading: !state.isLoading };

    case "EXPIRE_SESSION":
      return { ...state, expiredSession: true };

    case "REFRESH":
      const now = Date.now();
      const timeDiff = (now - state.lastRefresh) / 1000;

      if (timeDiff > 30) {
        toaster.create({ title: "به روزرسانی شد", type: "success" });
        return { ...state, lastRefresh: now };
      } else {
        const remainingTime = 30 - timeDiff;
        toaster.create({
          title: `باید حداقل ${remainingTime.toFixed(0)} ثانیه دیگر صبر کنید`,
          type: "error",
          duration: 3000,
        });
        return { ...state };
      }

    case "SET_ACTIVE_BUTTON":
      return { ...state, activeButton: action.payload };

    case "SET_FILTER_VALUE":
      return { ...state, optionalFilter: action.payload };

    case "TOGGLE_SELECT":
      return {
        ...state,
        selectMode: action.payload,
      };

    case "SET_PAGE":
      return { ...state, page: action.payload };

    case "RESET_SELECTION":
      return { ...state, selectMode: "" };

    case "LIKE_LIST":
      return {
        ...state,
        listOfImage: state.listOfImage.map((item) =>
          state.selectMode.includes(item.title)
            ? { ...item, liked: true }
            : item
        ),
        selectMode: "",
      };

    case "LIKE_PAGE_LIST":
      return {
        ...state,
        listOfImage: state.listOfImage.map((item) =>
          state.selectMode.includes(item.title)
            ? { ...item, likedPage: true }
            : item
        ),
        selectMode: "",
      };

    case "DONTSHOW_LIVE_LIST":
      return {
        ...state,
        listOfImage: state.listOfImage.map((item) =>
          state.selectMode.includes(item.title)
            ? { ...item, dontShowLive: true }
            : item
        ),
        selectMode: "",
      };

    case "DONTSHOW_PAGE_LIST":
      return {
        ...state,
        listOfImage: state.listOfImage.map((item) =>
          state.selectMode.includes(item.title)
            ? { ...item, dontShowPage: true }
            : item
        ),
        selectMode: "",
      };

    case "UPDATE_IMAGE_LIST":
      return {
        ...state,
        listOfImage: action.payload,
      };

    default:
      return state;
  }
}

function HomePage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [error, setError] = useState("");
  const [liveErrorState, setLiveError] = useState("");
  const { isSessionDialogOpen, extendSession, stopTimer } = useSession(
    3 * 3600000
  );
  const {
    data: loginData,
    isLoading: isLoginLoading,
    refetch: login,
    error: loginError,
    isError: isLoginError,
    isSuccess: isLoginSuccess,
  } = useLogin();

  const {
    data: liveData,
    isLoading: liveLoading,
    isError: isLiveError,
    error: liveError,
    refetch: liveRefetch,
  } = useLive();
  const {
    data: privateLiveData,
    isError: isPrivateLiveError,
    error: privateLiveError,
    refetch: privateLiveRefetch,
    isLoading: privateLoading,
  } = usePrivateLive();
  const {
    data: publicLiveData,
    isError: isPublicLiveError,
    error: publicLiveError,
    refetch: publicLiveRefetch,
    isLoading: publicLoading,
  } = usePublicLive();

  const handleDontShowLive = () => {
    const currentDontShow = JSON.parse(localStorage.getItem("dont-show")) || [];
    if (currentDontShow.includes(state.selectMode)) {
      const updatedList = currentDontShow.filter(
        (item) => item !== state.selectMode
      );
      localStorage.setItem("dont-show", JSON.stringify(updatedList));
    } else {
      const updatedList = [...currentDontShow, state.selectMode];
      localStorage.setItem("dont-show", JSON.stringify(updatedList));
    }
    dispatch({ type: "RESET_SELECTION" });
  };

  useEffect;

  useEffect(() => {
    if (isLoginSuccess) {
      // console.log(loginData, "profile");
      dispatch({
        type: "LOGIN",
        payload: {
          name: loginData.data.tName,
          paidTime: new Date(loginData.data.paidTime),
        },
      });
      liveRefetch();
    }
  }, [isLoginSuccess]);

  useEffect(() => {
    if (state.activeButton == "private") {
      privateLiveRefetch();
      if (privateLiveData?.status == "success") {
        dispatch({
          type: "UPDATE_IMAGE_LIST",
          payload: privateLiveData.data,
        });
      }
    } else if (state.activeButton == "public") {
      publicLiveRefetch();
      if (publicLiveData?.status == "success") {
        dispatch({
          type: "UPDATE_IMAGE_LIST",
          payload: publicLiveData.data,
        });
      }
    } else if (state.activeButton == "all") {
      liveRefetch();
      if (liveData?.status == "success") {
        dispatch({ type: "UPDATE_IMAGE_LIST", payload: liveData.data });
      }
    }
  }, [state.lastRefresh]);

  useEffect(() => {
    if (state.activeButton == "private") {
      privateLiveRefetch();
      if (privateLiveData?.status == "success") {
        dispatch({ type: "UPDATE_IMAGE_LIST", payload: privateLiveData.data });
      }
    } else if (state.activeButton == "public") {
      publicLiveRefetch();
      if (publicLiveData?.status == "success") {
        dispatch({ type: "UPDATE_IMAGE_LIST", payload: publicLiveData.data });
      }
    } else if (state.activeButton == "all") {
      liveRefetch();
      if (liveData?.status == "success") {
        dispatch({ type: "UPDATE_IMAGE_LIST", payload: liveData.data });
      }
    }
  }, [state.activeButton]);

  useEffect(() => {
    if (privateLiveData?.status == "success") {
      // console.log(privateLiveData, "private-live");
      dispatch({ type: "UPDATE_IMAGE_LIST", payload: privateLiveData.data });
    }
  }, [privateLiveData]);

  useEffect(() => {
    if (publicLiveData?.status == "success") {
      // console.log(publicLiveData, "public-live");
      dispatch({ type: "UPDATE_IMAGE_LIST", payload: publicLiveData.data });
    }
  }, [publicLiveData]);

  useEffect(() => {
    if (liveData?.status == "success") {
      // console.log(liveData, "all-live");
      dispatch({ type: "UPDATE_IMAGE_LIST", payload: liveData.data });
    }
  }, [liveData]);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get("token");

    if (token) {
      sessionStorage.setItem("token", token);

      queryParams.delete("token");

      const newUrl =
        window.location.pathname +
        (queryParams.toString() ? `?${queryParams.toString()}` : "");

      window.history.replaceState({}, document.title, newUrl);
    }

    if (!sessionStorage.getItem("token")) {
      dispatch({ type: "EXPIRE_SESSION" });
    } else {
      login();
    }
  }, []);

  useEffect(() => {
    if (isLoginError) {
      setError(loginError);
    } else if (isLiveError) {
      setLiveError(liveError);
    } else if (isPrivateLiveError) {
      setError(privateLiveError);
    } else if (isPublicLiveError) {
      setError(publicLiveError);
    } else {
      setError("");
    }
  }, [isLoginError, isLiveError, isPrivateLiveError, isPublicLiveError]);

  return (
    <Box overflowY={"auto"} width={"full"} minH={"40%"}>
      {isLoginLoading ? (
        <Box mx={"auto"} textAlign={"center"}>
          <Spinner borderWidth={"4px"} color={"teal"} size={"xl"} />{" "}
          <Heading size="lg" color="teal" dir="rtl">
            در حال بارگزاری...
          </Heading>
        </Box>
      ) : error?.status == 403 ? (
        <Box
          width={{ base: "90%", md: "40%" }}
          mx={"auto"}
          backgroundColor={"cyan.100"}
          p={5}
          rounded={"md"}
        >
          <Heading color={"blackAlpha.800"} size={"lg"} textAlign={"center"}>
            نشست شما منقضی شده است
          </Heading>
          <Heading color={"blackAlpha.600"} size={"sm"} textAlign={"center"}>
            لطفا خارج شده و مجددا وارد شوید
          </Heading>
        </Box>
      ) : error?.status == 503 ? (
        <Box
          width={{ base: "90%", md: "40%" }}
          mx={"auto"}
          backgroundColor={"cyan.100"}
          p={5}
          rounded={"md"}
        >
          <Heading
            color={"blackAlpha.800"}
            size={"lg"}
            textAlign={"center"}
          >چیزی یافت نشد </Heading>
          <Heading color={"blackAlpha.600"} size={"sm"} textAlign={"center"}>
            لطفا بعدا تلاش کنید
          </Heading>
        </Box>
      ) : error ? (
        <Box
          mx={"auto"}
          p={5}
          width={{ base: "80%", md: "70%", lg: "50%" }}
          backgroundColor={"cyan.100"}
          textAlign={"center"}
        >
          <Heading color={"cyan.900"}>{error?.response.data.message}</Heading>
        </Box>
      ) : (
        state.isLogged && (
          <Box
            width={{ base: "100%", sm: "90%", md: "80%", lg: "70%" }}
            m={"auto"}
            p={{ base: 2, md: 4 }}
          >
            <UserListDialog
              onToggle={() => dispatch({ type: "TOGGLE_USERLIST_DIALOG" })}
              isOpen={state.userListDialog}
            />

            <ExtendSessionDialog
              open={isSessionDialogOpen}
              onExtend={extendSession}
              onChange={stopTimer}
            />
            <Toaster />
            <Flex
              dir="rtl"
              justifyContent={"space-between"}
              width={"100%"}
              gap={4}
              mt={2}
              flexDirection={"row"}
              alignItems={"center"}
            >
              <UserInfo
                name={state.userName}
                toggleDialog={() =>
                  dispatch({ type: "TOGGLE_USERLIST_DIALOG" })
                }
                paid={state.paidTime}
              />

              <RefreshIcon
                isRefreshing={false}
                onRefresh={() => dispatch({ type: "REFRESH" })}
              />
            </Flex>

            <ButtonFilter
              optionalFilter={state.optionalFilter}
              onValueChange={(val) =>
                dispatch({ type: "SET_FILTER_VALUE", payload: val })
              }
            />

            <ButtonGroupFilter
              activeButton={state.activeButton}
              changeActiveButton={(btn) =>
                dispatch({ type: "SET_ACTIVE_BUTTON", payload: btn })
              }
            />

            <ImageList
              isError={liveErrorState}
              onSelect={(body) =>
                dispatch({ type: "TOGGLE_SELECT", payload: body })
              }
              selectedItems={state.selectMode}
              images={
                state.listOfImage
                  ? state.listOfImage.slice(
                      (state.page - 1) * 15,
                      Math.min(state.page * 15, state.listOfImage.length)
                    )
                  : []
              }
              optionalFilter={state.optionalFilter}
              isLoading={liveLoading || privateLoading || publicLoading}
            />

            <ActionBar
              selectedItem={state.selectMode}
              onClose={() => dispatch({ type: "RESET_SELECTION" })}
            />

            {state.isLoading && (
              <Paging
                setPage={(page) =>
                  dispatch({ type: "SET_PAGE", payload: page })
                }
                page={state.page}
                pageCount={Math.ceil(state.listOfImage.length / 15) + 1}
              />
            )}
          </Box>
        )
      )}
    </Box>
  );
}

export default HomePage;
