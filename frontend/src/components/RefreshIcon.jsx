import { Box, Icon, Spinner } from "@chakra-ui/react";
import { MdOutlineRefresh } from "react-icons/md";
import { Tooltip } from "./ui/tooltip";
import { toaster } from "./ui/toaster";

function RefreshIcon({ onRefresh, isRefreshing }) {
  return (
    <Box ml={3} pt={3}>
      {isRefreshing ? (
        <Spinner color={"teal.700"} size={"lg"} borderWidth={"3px"} />
      ) : (
        <Tooltip
          showArrow
          positioning={{ placement: "right-end" }}
          content="refresh lives"
          backgroundColor="red"
        >
          <Icon
            cursor={"pointer"}
            as={MdOutlineRefresh}
            size={"2xl"}
            onClick={() => {
              onRefresh();
            }}
            color={"teal.700"}
          />
        </Tooltip>
      )}
    </Box>
  );
}

export default RefreshIcon;
