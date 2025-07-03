"use client";

import { Button } from "@/components/ui/button";
import ResponsiveDialog from "@/components/ui/responsive-dialog";
import { useCallback, useEffect, useState } from "react";

export default function useConfirm(title: string, description: string) {
  const [promise, setPromise] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  function confirm() {
    return new Promise((resolve) => setPromise({ resolve }));
  }

  const handleClose = useCallback(() => {
    setPromise(null);
  }, []);

  const handleConfirm = useCallback(() => {
    promise?.resolve(true);
    handleClose();
  }, [promise, handleClose]);

  function handleCancel() {
    promise?.resolve(false);
    handleClose();
  }

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        handleConfirm()
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [handleConfirm]);

  function ConfirmationDialog() {
    return (
      <ResponsiveDialog
        isOpen={promise !== null}
        onOpenChange={handleClose}
        title={title}
        description={description}
      >
        <div className="flex flex-col-reverse lg:flex-row w-full gap-y-2 gap-x-2 items-center justify-end pt-4">
          <Button
            type="button"
            onClick={handleCancel}
            variant="outline"
            className="w-full lg:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className="w-full lg:w-auto"
          >
            Confirm
          </Button>
        </div>
      </ResponsiveDialog>
    );
  }

  return {
    ConfirmationDialog,
    confirm,
  };
}
