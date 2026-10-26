import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

type DeleteQuackButtonProps = {
  quackId: string
  // Set when a moderator deletes someone else's quack, so the dialog names
  // whose quack it is.
  authorUsername?: string
}

export function DeleteQuackButton({ quackId, authorUsername }: DeleteQuackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const deleteQuack = useDeleteQuack()

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete quack"
          className="text-muted-foreground"
        >
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {authorUsername ? `Delete @${authorUsername}'s quack?` : "Delete this quack?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {authorUsername ? "You're removing it as a moderator. " : null}It will be removed from
            the feed for everyone, along with any poll and its votes. This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteQuack.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteQuack.isPending}
            onClick={(event) => {
              // Stay open until the server confirms, so a failure can be retried.
              event.preventDefault()
              deleteQuack.mutate(quackId, { onSuccess: () => setIsOpen(false) })
            }}
          >
            {deleteQuack.isPending ? <Loader2 className="animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
