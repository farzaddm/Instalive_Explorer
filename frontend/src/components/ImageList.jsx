import {
  Box,
  Grid,
  Heading,
  Icon,
  Image,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { IoMdRadioButtonOff, IoMdRadioButtonOn } from "react-icons/io";
import { useState, useRef, useEffect } from "react";
import { useLiveLike } from "./http/useHttp";

function ImageList({
  selectedItems,
  images,
  onSelect,
  isLoading,
  optionalFilter,
  isError,
}) {
  const [touchStart, setTouchStart] = useState(null);
  const liveLikeMutation = useLiveLike();
  const [calcedImageList, setCalcedImageList] = useState([]);
  const [likedLives, setLikedLives] = useState(
    JSON.parse(localStorage.getItem("liked")) || []
  );
  const touchTimeout = useRef(null);
  const clickTimeout = useRef(null);
  const clickCount = useRef(0);

  useEffect(() => {
    if (optionalFilter === "") {
      const ignoreLiveList =
        JSON.parse(localStorage.getItem("dont-show")) || [];
      setCalcedImageList(
        images.filter((item) => !ignoreLiveList.includes(item.liveBroadcastId))
      );
    } else if (optionalFilter === "love") {
      const likedLives = JSON.parse(localStorage.getItem("liked")) || [];
      setCalcedImageList(
        images.filter((item) => likedLives.includes(item.liveBroadcastId))
      );
    } else if (optionalFilter === "hate") {
      const ignoreLiveList =
        JSON.parse(localStorage.getItem("dont-show")) || [];
      setCalcedImageList(
        images.filter((item) => ignoreLiveList.includes(item.liveBroadcastId))
      );
    } else if (optionalFilter === "view") {
      setCalcedImageList(
        [...images].sort((a, b) => b.viewercount - a.viewercount)
      );
    } else if (optionalFilter === "popularity") {
      setCalcedImageList([...images].sort((a, b) => b.likeCount - a.likeCount));
    }
  }, [optionalFilter, images]);

  useEffect(() => {
    localStorage.setItem("liked", JSON.stringify(likedLives));
  }, [likedLives]);

  const handleLike = (liveBroadcastId) => {
    const state = likedLives.includes(liveBroadcastId) ? 2 : 1;
    // console.log(
    //   JSON.stringify({
    //     liveBroadcastId: liveBroadcastId,
    //     state,
    //   })
    // );
    liveLikeMutation.mutate({
      liveBroadcastId: liveBroadcastId,
      state,
    });

    setLikedLives((prevValue) =>
      prevValue.includes(liveBroadcastId)
        ? prevValue.filter((item) => item !== liveBroadcastId)
        : [...prevValue, liveBroadcastId]
    );
  };

  const handleTouchStart = (title) => {
    setTouchStart(Date.now());
    touchTimeout.current = setTimeout(() => {
      onSelect(title);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (Date.now() - touchStart < 500) {
      clearTimeout(touchTimeout.current);
    }
    setTouchStart(null);
  };

  const handleClick = (liveUserName, title) => {
    clickCount.current += 1;

    if (clickCount.current === 1) {
      clickTimeout.current = setTimeout(() => {
        if (clickCount.current === 1) {
          window.open(`https://www.instagram.com/${liveUserName}`, "_blank");
        }
        clickCount.current = 0;
      }, 500);
    } else if (clickCount.current === 2) {
      clearTimeout(clickTimeout.current);
      clickCount.current = 0;
      onSelect(title);
    }
  };

  return (
    <>
      {isError ? (
        <Box
          mx={"auto"}
          p={5}
          width={{ base: "80%", md: "70%", lg: "50%" }}
          backgroundColor={"cyan.100"}
          textAlign={"center"}
        >
          <Heading color={"cyan.900"}>{isError?.response.data.message}</Heading>
        </Box>
      ) : isLoading ? (
        <Box width={"100%"} textAlign={"center"}>
          <Spinner color={"cyan.600"} size={"lg"} borderWidth={"3px"} />
        </Box>
      ) : calcedImageList.length > 0 ? (
        <Grid
          userSelect={"none"}
          gap={{ base: 2, md: 4 }}
          width={{ base: "100%", md: "95%" }}
          mx={"auto"}
          templateColumns={{
            base: "repeat(3, 1fr)",
            sm: "repeat(4, 1fr)",
            md: "repeat(5, 1fr)",
          }}
          transition={"all .3s ease"}
        >
          {calcedImageList.map((item, index) => {
            {
              /* const handleError = (event) => {
              if (item.coverFrameAddress == item.dashPlaybackAddress) {
                event.target.src = "/defaultLive.jpg";
              } else if (event.target.src.endsWith(item.dashPlaybackAddress)) {
                event.target.src = `/api/public/${item.coverFrameAddress}`;
              } else if (event.target.src.endsWith(item.coverFrameAddress)) {
                event.target.src = "/defaultLive.jpg";
              }
            }; */
            }

            return (
              <Box
                onContextMenu={(e) => e.preventDefault()}
                key={index}
                transition={"all .3s ease"}
                position={"relative"}
                _hover={
                  selectedItems.liveBroadcastId
                    ? null
                    : {
                        transform: "scale(1.05)",
                        transition: "transform 0.2s",
                      }
                }
              >
                <Image
                  onMouseDown={() =>
                    handleTouchStart({
                      liveBroadcastId: item.liveBroadcastId,
                      liveUserId: item.liveUserId,
                      liveUserName: item.liveUserName,
                      liveFullName: item.liveFullName,
                    })
                  }
                  onMouseUp={handleTouchEnd}
                  onClick={() =>
                    handleClick(item.liveUserName, {
                      liveBroadcastId: item.liveBroadcastId,
                      liveUserId: item.liveUserId,
                      liveUserName: item.liveUserName,
                      liveFullName: item.liveFullName,
                    })
                  }
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onSelect({
                      liveBroadcastId: item.liveBroadcastId,
                      liveUserId: item.liveUserId,
                      liveUserName: item.liveUserName,
                      liveFullName: item.liveFullName,
                    });
                  }}
                  backgroundColor={"gray.300/50"}
                  width={"100%"}
                  src={`/api/public/${item.dashPlaybackAddress}`}
                  alt={item.liveUserName}
                  objectFit="cover"
                  aspectRatio="6/9"
                  borderRadius="md"
                  // onError={handleError}
                />

                <Icon
                  position={"absolute"}
                  color={
                    likedLives == item.liveBroadcastId ? "red" : "gray.300"
                  }
                  zIndex={10}
                  size={"lg"}
                  top={2}
                  left={2}
                  transition={"all .3s ease-out"}
                  cursor={"pointer"}
                  _hover={{ transform: "scale(1.1)" }}
                  onClick={() => handleLike(item.liveBroadcastId)}
                >
                  {likedLives == item.liveBroadcastId ? (
                    <FaHeart />
                  ) : (
                    <FaRegHeart />
                  )}
                </Icon>

                {selectedItems.liveBroadcastId && (
                  <>
                    <Box
                      position={"absolute"}
                      top={0}
                      bottom={0}
                      right={0}
                      left={0}
                      zIndex={100}
                      rounded={"md"}
                      backgroundColor={"blackAlpha.900/60"}
                    ></Box>
                    <Icon
                      position={"absolute"}
                      color={"gray.100"}
                      zIndex={1000}
                      size={"2xl"}
                      top={2}
                      right={2}
                      cursor={"pointer"}
                      transition={"all .15s ease"}
                      _hover={{ color: "gray.400", transform: "scale(1.05)" }}
                      onClick={() => {
                        // console.log(selectedItems);
                        onSelect(item.liveBroadcastId);
                      }}
                    >
                      {selectedItems.liveBroadcastId == item.liveBroadcastId ? (
                        <IoMdRadioButtonOn />
                      ) : (
                        <IoMdRadioButtonOff />
                      )}
                    </Icon>
                  </>
                )}
              </Box>
            );
          })}
        </Grid>
      ) : (
        <Box
          width={"100%"}
          textAlign={"center"}
          height={"50%"}
          backgroundColor={"cyan.100"}
          border={"1px solid cyan"}
          p={4}
          rounded={"md"}
        >
          <Heading color={"black"}>لایو فعالی وجود ندارد</Heading>
          <Text color={"black"}>برای تلاش مجدد از دکمه رفرش استفاده کنید</Text>
          <Text color={"black"}>
            برای جلوگیری از بن شدن از رفرش بیش از حد جلوگیری کنید
          </Text>
        </Box>
      )}
    </>
  );
}

export default ImageList;
