import { Box, Button, Flex, Heading, Spinner, Text } from "@chakra-ui/react";
import { usePageRelation } from "./http/useHttp";
import { useEffect } from "react";
import { toaster } from "./ui/toaster";

function UserDialogCard({ list, onToggle, setFilter, isLoading, filterState }) {
  const pageRelationMutation = usePageRelation();

  const handleClick = (item) => {
    const relationState = filterState == "love" ? 2 : 1;
    // console.log(item);
    pageRelationMutation.mutate({
      pageId: item.pageId,
      igUserName: item.igUserName,
      igFullName: item.igFullName,
      relationState: relationState,
    });
  };

  const handleRemove = (item) => {
    pageRelationMutation.mutate({
      pageId: item.pageId,
      igUserName: item.igUserName,
      igFullName: item.igFullName,
      relationState: 3,
    });
  };

  useEffect(() => {
    if (pageRelationMutation.data?.status == "success") {
      // onToggle();
      setFilter("");
      toaster.create({
        title: "با موفقیت به لیست اضافه شد",
        type: "success",
      });
    } else if (pageRelationMutation.isError) {
      // onToggle();
      setFilter("");
      toaster.error({
        title: pageRelationMutation.error?.response.data.message,
        type: "error",
      });
    }
  }, [pageRelationMutation.data]);

  return (
    <>
      {isLoading ? (
        <Box textAlign={"center"}>
          <Spinner color={"blue"} textAlign={"center"} size={"lg"} />
        </Box>
      ) : list.length == 0 ? (
        <Heading color={"whiteAlpha.900"} textAlign={"center"}>
          لیست خالی است
        </Heading>
      ) : (
        list.map((item, index) => (
          <Flex
            key={index}
            flexDirection={"row"}
            width={{ base: "100%", md: "80%" }}
            alignItems={"center"}
            justifyContent={"space-around"}
            backgroundColor={"cyan.700/60"}
            mx={"auto"}
            my={3}
            rounded={"md"}
          >
            <Flex flexDir={"column"}>
              <Heading color={"whiteAlpha.900"}>{item.igUserName}</Heading>
              <Text color={"whiteAlpha.700"}>{item.igFullName}</Text>
            </Flex>
            <Button
              size={"sm"}
              variant={"ghost"}
              onClick={() => handleClick(item)}
              colorPalette={"blue"}
            >
              تغییر
            </Button>
            <Button
              size={"sm"}
              variant={"ghost"}
              onClick={() => handleRemove(item)}
              colorPalette={"red"}
            >
              حذف
            </Button>
          </Flex>
        ))
      )}
    </>
  );
}

export default UserDialogCard;
