import { Button, Group } from "@chakra-ui/react";

export const filterItems = [
  { title: "همه", value: "all" },
  { title: "فقط پابلیک", value: "public" },
  { title: "فقط پرایویت", value: "private" },
];

function ButtonGroupFilter({ activeButton, changeActiveButton }) {
  return (
    <Group
      dir="rtl"
      mb={5}
      transition="all 0.2s ease-in-out"
      attached
      grow
      width={{ base: "100%", md: "70%", lg: "60%" }}
      mx={"auto"}
    >
      {filterItems.map((item) => (
        <Button
          key={item.value}
          color={"cyan.700"}
          borderColor={"cyan.400"}
          p={5}
          backgroundColor={activeButton == item.value ? "cyan.300" : "cyan.100"}
          _hover={{
            backgroundColor:
              activeButton == item.value ? "cyan.400" : "cyan.200",
          }}
          onClick={() => changeActiveButton(item.value)}
          transition={"all .3s ease"}
        >
          {item.title}
        </Button>
      ))}
    </Group>
  );
}

export default ButtonGroupFilter;
