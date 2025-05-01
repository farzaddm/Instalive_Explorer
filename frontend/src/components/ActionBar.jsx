import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import { IoClose } from "react-icons/io5";
import { keyframes } from "@emotion/react";
import { useEffect, useState } from "react";
import { usePageRelation } from "./http/useHttp";

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  to {
    opacity: 0;
    transform: translate(-50%, 20px);
  }
`;

function ActionBar({ selectedItem, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const pageRelationMutation = usePageRelation();

  const actionText = [
    {
      text: "پیج محبوب من",
      value: "favorite_page",
    },
    { text: "این لایو رو نشون نده", value: "notInterested_live" },
    {
      text: "لایو های این پیج را نشون نده",
      value: "notInterested_page",
    },
  ];

  useEffect(() => {
    if (selectedItem?.liveBroadcastId) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [selectedItem]);

  const handleSubmit = (value) => {
    if (!selectedItem) return;

    if (value === "favorite_page") {
      // console.log({
      //   pageId: selectedItem?.liveUserId,
      //   igUserName: selectedItem?.liveUserName,
      //   igFullName: selectedItem?.liveFullName,
      //   relationState: 1,
      // });
      pageRelationMutation.mutate({
        pageId: selectedItem?.liveUserId,
        igUserName: selectedItem?.liveUserName,
        igFullName: selectedItem?.liveFullName,
        relationState: 1,
      });
    } else if (value === "notInterested_page") {
      pageRelationMutation.mutate({
        pageId: selectedItem?.liveUserId,
        igUserName: selectedItem?.liveUserName,
        igFullName: selectedItem?.liveFullName,
        relationState: 2,
      });
    } else if (value === "notInterested_live") {
      const currentDontShow =
        JSON.parse(localStorage.getItem("dont-show")) || [];
      if (!currentDontShow.includes(selectedItem.liveBroadcastId)) {
        localStorage.setItem(
          "dont-show",
          JSON.stringify([...currentDontShow, selectedItem.liveBroadcastId])
        );
      } else {
        localStorage.setItem(
          "dont-show",
          JSON.stringify(
            currentDontShow.filter(
              (item) => item !== selectedItem.liveBroadcastId
            )
          )
        );
      }
    }
    onClose();
  };

  // useEffect(() => {
  //   console.log(pageRelationMutation.error);
  // }, [pageRelationMutation.error]);

  return (
    <Flex
      backgroundColor={"cyan.200"}
      opacity={0.9}
      p={3}
      pt={6}
      rounded={"md"}
      alignItems={"center"}
      gap={2}
      shadow={"md"}
      transition={"all .3s ease-in-out"}
      position={"fixed"}
      bottom={6}
      width={"13rem"}
      zIndex={1000}
      direction={"column"}
      left={"50%"}
      transform={"translate(-50%, 0)"}
      animation={
        isVisible ? `${fadeIn} 0.3s ease-in-out` : `${fadeOut} 0.3s ease-in-out`
      }
      display={isVisible ? "flex" : "none"}
    >
      <Icon
        color={"cyan.800"}
        position={"absolute"}
        top={2}
        onClick={onClose}
        size={"lg"}
        right={2}
        as={IoClose}
        cursor={"pointer"}
      />
      {actionText.map((item) => (
        <Text
          key={item.text}
          color={"cyan.700"}
          cursor={"pointer"}
          transition={"all .3s ease"}
          _hover={{ textDecoration: "underline" }}
          onClick={() => handleSubmit(item.value)}
        >
          {item.text}
        </Text>
      ))}
    </Flex>
  );
}

export default ActionBar;
