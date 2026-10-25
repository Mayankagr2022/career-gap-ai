import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';

export function DeleteSessionModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-overlay !bg-transparent">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
        transition={{ duration: 0.15 }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-card relative max-w-md overflow-hidden p-6"
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/30 bg-red-500/10">
          <Trash2 className="h-5 w-5 text-red-300" />
        </div>
        <h3 className="mb-2 font-display text-xl font-bold">Delete Chat</h3>
        <p className="mb-6 text-muted-foreground">
          Are you sure you want to delete this conversation? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary min-h-[44px] px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary min-h-[44px] bg-destructive px-4 py-2 text-sm shadow-none hover:bg-destructive/90"
            style={{ backgroundImage: 'none' }}
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
