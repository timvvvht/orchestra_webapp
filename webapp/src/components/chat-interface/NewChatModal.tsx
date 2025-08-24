/**
 * NewChatModal Component - Webapp Implementation
 *
 * New chat modal with image upload support via drag and drop or file picker.
 */

import React, { useState, useCallback, useRef } from "react";
import { Image } from "lucide-react";
import { motion } from "framer-motion";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat?: (message: string, images: string[]) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onCreateChat,
}) => {
  const [message, setMessage] = useState("");
  const [localImages, setLocalImages] = useState<Base64URLString[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const maxPromptSize = parseInt(
    String(import.meta.env.VITE_MAX_PROMPT_SIZE * 1024 * 1024) || "15728640"
  ); // 15MB default

  const handleImageUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;

        // Calculate total size
        const currentTotalSize = localImages.reduce(
          (total, img) => total + img.length,
          0
        );
        const newTotalSize = currentTotalSize + base64String.length;

        if (newTotalSize > maxPromptSize) {
          console.error(
            `Total prompt size would exceed ${Math.round(maxPromptSize / 1024 / 1024)}MB limit`
          );
          return;
        }

        setLocalImages((prev) => [...prev, base64String]);
      };
      reader.readAsDataURL(file);
    },
    [localImages, maxPromptSize]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      files.forEach((file) => {
        if (file.type.startsWith("image/")) {
          handleImageUpload(file);
        }
      });
    },
    [handleImageUpload]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        handleImageUpload(file);
      }
    });
  };

  const removeImage = useCallback((index: number) => {
    setLocalImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreateChat = () => {
    if (onCreateChat && message.trim()) {
      onCreateChat(message.trim(), localImages);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      id="new-chat-modal"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center z-10">
            <div className="text-blue-600 dark:text-blue-400 text-center">
              <Image className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">Drop images here</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">New Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Start a conversation..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 min-h-[100px] resize-none"
            />
          </div>

          <div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              id="image-upload"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(file);
                }

                e.target.value = "";
              }}
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => document.getElementById("image-upload")?.click()}
              className="relative group p-2 cursor-pointer"
              title="Upload Image"
            >
              <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <Image className="relative h-4 w-4 text-white/40 group-hover:text-white/60" />
            </motion.button>

            {localImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <span className="text-white text-xs leading-none">×</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateChat}
            disabled={!message.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
