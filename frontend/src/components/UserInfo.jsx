import { Box, Heading, Text } from "@chakra-ui/react";

function UserInfo({ name, paid, toggleDialog }) {
  const remainingTime = paid.getTime() - Date.now();
  return (
    <Box
      backgroundColor={"cyan.100"}
      p={4}
      borderRadius="md"
      border={"1px solid cyan"}
      mr={2}
    >
      <Heading
        color={"cyan.600"}
        _hover={{ textDecoration: "underline" }}
        cursor={"pointer"}
        onClick={toggleDialog}
        size="md"
        textAlign="center"
      >
        {name}
      </Heading>
      <Text color={"cyan.900"} textAlign="right">
        {Math.floor(remainingTime / (1000 * 60 * 60 * 24))} روز اشتراک دارید
      </Text>
    </Box>
  );
}

export default UserInfo;
