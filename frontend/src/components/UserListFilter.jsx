import { Button, Grid } from "@chakra-ui/react";
import { useState } from "react";

const filterItems = [
  { title: "پیج محبوب", value: "love" },
  { title: "پیج را نمایش نده", value: "hate" },
];

function UserListFilter({ Filter, setFilter }) {
  return (
    <Grid
      mt={3}
      dir="rtl"
      py={4}
      templateColumns="1fr 1fr"
      gap={2}
      templateRows="1fr 1fr"
    >
      {filterItems.map((item) => (
        <Button
          key={item.value}
          size={{ base: "xs", md: "sm", lg: "md" }}
          onClick={() => setFilter(item.value)}
          bg={Filter === item.value ? "cyan.300" : "cyan.100"}
          color={"cyan.700"}
          _hover={{
            bg: Filter === item.value ? "cyan.400" : "cyan.200",
          }}
          borderColor={"cyan.400"}
          transition="all 0.2s ease-in-out"
          whiteSpace="normal"
          wordWrap="break-word"
          textAlign="center"
          py={{ base: 6, sm: 5, md: 4 }}
        >
          {item.title}
        </Button>
      ))}
    </Grid>
  );
}

export default UserListFilter;
