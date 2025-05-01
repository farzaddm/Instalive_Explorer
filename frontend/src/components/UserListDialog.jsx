import { Button } from "@chakra-ui/react";
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogActionTrigger,
} from "./ui/dialog";
import UserDialogCard from "./UserDialogCard";
import UserListFilter from "./UserListFilter";
import { useEffect, useState } from "react";
import { useHateList, useLoveList } from "./http/useHttp";
import { toaster } from "./ui/toaster";

function UserListDialog({ isOpen, onToggle }) {
  const [Filter, setFilter] = useState("love");
  const [data, setData] = useState([]);
  const {
    data: loveListData,
    isLoading: loveListLoading,
    error: loveListError,
    refetch: loveListRefetch,
  } = useLoveList();
  const {
    data: hateListData,
    isLoading: hateListLoading,
    error: hateListError,
    refetch: hateListRefetch,
  } = useHateList();

  useEffect(() => {
    if (Filter == "love") {
      // console.log(loveListData, "love");
      setData(loveListData?.data);
    }
  }, [loveListData]);
  useEffect(() => {
    if (Filter == "hate") {
      // console.log(hateListData, "hate");
      setData(hateListData?.data);
    }
  }, [hateListData]);

  useEffect(() => {
    if (Filter === "love") {
      loveListRefetch();
    } else if (Filter === "hate") {
      hateListRefetch();
    }
  }, [Filter, loveListRefetch, hateListRefetch]);

  useEffect(() => {
    if (Filter === "love" && loveListData) {
      setData(loveListData?.data || []);
    } else if (Filter === "hate" && hateListData) {
      setData(hateListData?.data || []);
    }
  }, [Filter, loveListData, hateListData]);

  useEffect(() => {
    if (hateListError) {
      toaster.create({
        title: hateListError,
        type: "error",
      });
    } else if (loveListError) {
      toaster.create({
        title: loveListError,
        type: "error",
      });
    }
  }, [hateListError, loveListError]);

  return (
    <DialogRoot
      lazyMount
      open={isOpen}
      scrollBehavior="inside"
      onOpenChange={onToggle}
      motionPreset="slide-in-top"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <UserListFilter Filter={Filter} setFilter={setFilter} />
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <UserDialogCard
            setFilter={setFilter}
            onToggle={onToggle}
            list={Filter == "" ? [] : data}
            isLoading={loveListLoading || hateListLoading}
            filterState={Filter}
          />
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="outline">لغو</Button>
          </DialogActionTrigger>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  );
}

export default UserListDialog;
