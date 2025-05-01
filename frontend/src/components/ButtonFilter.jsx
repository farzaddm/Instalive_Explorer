import { Grid, Button } from "@chakra-ui/react";

const filterItems = [
  { title: "مرتب‌سازی بر اساس محبوبیت", value: "popularity" },
  { title: "مرتب‌سازی بر اساس ویو", value: "view" },
  { title: "دیگه این لایوها رو نشون نده", value: "hate" },
  { title: "لایوهای محبوب من", value: "love" },
];

function ButtonFilter({ optionalFilter, onValueChange }) {
  return (
    <Grid
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
          onClick={() => onValueChange(optionalFilter === item.value ? "" : item.value)}
          bg={optionalFilter === item.value ? "cyan.300" : "cyan.100"}
          color={"cyan.700"}
          _hover={{
            bg: optionalFilter === item.value ? "cyan.400" : "cyan.200",
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

export default ButtonFilter;
