import { motion } from 'framer-motion';

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
        className="absolute inset-0 bg-black/60"
        transition={{ duration: 0.15 }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-card relative max-w-md overflow-hidden p-6"
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <h3 className="font-display text-xl font-bold mb-2">Delete Chat</h3>
        <p className="text-muted-foreground mb-6">
          Are you sure you want to delete this conversation? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-primary bg-destructive hover:bg-destructive/90 px-4 py-2 text-sm shadow-none"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}
