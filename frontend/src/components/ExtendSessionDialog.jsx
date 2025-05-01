import { Button, Spinner, Text } from "@chakra-ui/react";
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "./ui/dialog";
import { useNewToken } from "./http/useHttp";
import { useEffect } from "react";

function ExtendSessionDialog({ open, onExtend, onChange }) {
  const { refetch, data, isLoading, isError, error } = useNewToken();
  const handleExtend = () => {
    refetch();
  };

  useEffect(() => {
    if (data?.status == "success") {
      sessionStorage.setItem("token", data?.data);
      onExtend();
    }
  }, [data]);

  return (
    <DialogRoot
      backgroundColor={"cyan.100"}
      lazyMount
      open={open}
      onOpenChange={onChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>نشست در حال منقضی شدن است</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {isLoading ? (
            <Spinner color={"blue"} size={"md"} />
          ) : isError ? (
            <Text>{error?.message}</Text>
          ) : (
            <Text>برای تمدید نشست خود کلیک کنید </Text>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">بیخیال</Button>
          </DialogActionTrigger>
          <Button onClick={handleExtend}>تمدید</Button>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  );
}

export default ExtendSessionDialog;
