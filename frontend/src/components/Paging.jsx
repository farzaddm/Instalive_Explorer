import { Box, HStack } from "@chakra-ui/react";
import {
  PaginationNextTrigger,
  PaginationPageText,
  PaginationPrevTrigger,
  PaginationRoot,
} from "./ui/pagination";

function Paging({ page, setPage, pageCount}) {
  return (
    <Box textAlign={"center"} mt={4}>
      <PaginationRoot
        color="blackAlpha.900"
        backgroundColor="cyan.100"
        rounded="md"
        border="cyan 1px solid"
        display="inline-block"
        p={3}
        count={pageCount}
        pageSize={2}
        defaultPage={1}
        page={page}
        onPageChange={(d) => setPage(d.page)}
      >
        <HStack gap="4">
          <PaginationPrevTrigger
            color="blackAlpha.800"
            _hover={{ backgroundColor: "cyan.600" }}
          />
          <PaginationPageText />
          <PaginationNextTrigger
            color="blackAlpha.800"
            _hover={{ backgroundColor: "cyan.600" }}
          />
        </HStack>
      </PaginationRoot>
    </Box>
  );
}

export default Paging;
