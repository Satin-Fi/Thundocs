import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ImageItem = {
  id: string;
  url: string;
  name: string;
};

interface ImageReorderGridProps {
  images: ImageItem[];
  onReorder: (newOrder: ImageItem[]) => void;
  onDelete?: (imageId: string) => void;
  onEdit?: (imageId: string) => void;
}

// Declare Sortable as a global variable
declare global {
  interface Window {
    Sortable: any;
  }
}

const ImageReorderGrid = React.memo(function ImageReorderGrid({ images, onReorder, onDelete, onEdit }: ImageReorderGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const sortableRef = useRef<any>(null);
  const dragHintRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (!gridRef.current) return;

    const initSortable = () => {
      if (!window.Sortable) {
        setTimeout(initSortable, 100);
        return;
      }

      // Destroy existing sortable instance
      if (sortableRef.current) {
        sortableRef.current.destroy();
      }

      if (images.length === 0) {
        return;
      }

      // Create new sortable instance with Claude logic configuration
      sortableRef.current = window.Sortable.create(gridRef.current, {
        animation: 300,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        forceFallback: false,
        fallbackTolerance: 3,
        onStart: function(evt: any) {
          if (dragHintRef.current) {
            dragHintRef.current.classList.add('show');
          }
          evt.item.style.cursor = 'grabbing';
        },
        onEnd: function(evt: any) {
          if (dragHintRef.current) {
            dragHintRef.current.classList.remove('show');
          }
          evt.item.style.cursor = 'grab';
          
          // Get the new order
          const oldIndex = evt.oldIndex;
          const newIndex = evt.newIndex;
          
          if (oldIndex !== newIndex) {
            // Move the image in our array
            const newImages = [...images];
            const movedImage = newImages.splice(oldIndex, 1)[0];
            newImages.splice(newIndex, 0, movedImage);
            onReorder(newImages);
          }
        },
        onMove: function(evt: any) {
          // Optional: Add visual feedback during move
          return true;
        }
      });
    };

    initSortable();

    return () => {
      if (sortableRef.current) {
        sortableRef.current.destroy();
        sortableRef.current = null;
      }
    };
  }, [images, onReorder]);

  const handleDelete = (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      onDelete(imageId);
    }
  };

  const handleEdit = (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEdit) {
      onEdit(imageId);
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No images uploaded yet. Add some images to get started!</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .image-item {
          position: relative;
          border-radius: 15px;
          overflow: hidden;
          cursor: grab;
          transition: all 0.3s ease;
          background: white;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
          aspect-ratio: 1;
          border: 2px solid transparent;
        }
        
        .image-item:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 
            0 20px 50px rgba(0, 0, 0, 0.25),
            0 0 25px rgba(0, 255, 255, 0.5),
            0 0 50px rgba(0, 255, 255, 0.2),
            inset 0 0 15px rgba(0, 255, 255, 0.05);
          border: 2px solid rgba(0, 255, 255, 0.6);
        }
        
        .image-item.sortable-ghost {
          opacity: 0.3;
          background: linear-gradient(45deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2));
          border: 3px dashed #667eea;
        }
        
        .image-item.sortable-ghost img {
          opacity: 0;
        }
        
        .image-item.sortable-ghost .image-number,
        .image-item.sortable-ghost .delete-btn {
          opacity: 0;
        }
        
        .image-item.sortable-ghost::before {
          content: '+';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 3rem;
          color: #667eea;
          font-weight: bold;
          z-index: 10;
        }
        
        .image-item.sortable-chosen {
          cursor: grabbing;
          transform: rotate(5deg) scale(0.95);
          z-index: 1000;
        }
        
        .image-item.sortable-drag {
          opacity: 0.8;
          transform: rotate(5deg) scale(1.05);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        
        .image-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          pointer-events: none;
        }
        
        .image-number {
          position: absolute;
          top: 10px;
          left: 10px;
          background: linear-gradient(45deg, #667eea, #764ba2);
          color: white;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.9rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
          z-index: 10;
          pointer-events: none;
        }
        
        .delete-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 59, 48, 0.9);
          color: white;
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.3s ease;
          z-index: 10;
        }
        
        .edit-btn {
          position: absolute;
          top: 10px;
          right: 50px;
          background: linear-gradient(45deg, #10b981, #059669);
          color: white;
          border: none;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.3s ease;
          z-index: 10;
        }
        
        .image-item:hover .edit-btn {
          opacity: 1;
          transform: scale(1);
        }
        
        .edit-btn:hover {
          background: linear-gradient(45deg, #059669, #047857);
          transform: scale(1.1);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }
        
        @media (max-width: 768px) {
          .image-number {
            width: 28px;
            height: 28px;
            font-size: 0.8rem;
            top: 8px;
            left: 8px;
          }
          
          .delete-btn {
            width: 26px;
            height: 26px;
            font-size: 14px;
            top: 8px;
            right: 8px;
          }
          
          .edit-btn {
            width: 26px;
            height: 26px;
            font-size: 12px;
            top: 8px;
            right: 42px;
          }
          
          .image-item:hover {
            transform: translateY(-4px) scale(1.02);
            box-shadow: 
              0 15px 35px rgba(0, 0, 0, 0.2),
              0 0 20px rgba(0, 255, 255, 0.4),
              0 0 40px rgba(0, 255, 255, 0.15),
              inset 0 0 10px rgba(0, 255, 255, 0.03);
            border: 2px solid rgba(0, 255, 255, 0.5);
          }
        }
        
        @media (max-width: 480px) {
          .image-number {
            width: 24px;
            height: 24px;
            font-size: 0.7rem;
            top: 6px;
            left: 6px;
          }
          
          .delete-btn {
            width: 22px;
            height: 22px;
            font-size: 12px;
            top: 6px;
            right: 6px;
          }
          
          .edit-btn {
            width: 22px;
            height: 22px;
            font-size: 10px;
            top: 6px;
            right: 34px;
          }
          
          .image-item:hover {
            transform: translateY(-2px) scale(1.01);
            box-shadow: 
              0 10px 25px rgba(0, 0, 0, 0.15),
              0 0 15px rgba(0, 255, 255, 0.3),
              0 0 30px rgba(0, 255, 255, 0.1);
            border: 1px solid rgba(0, 255, 255, 0.4);
          }
        }
        
        .image-item:hover .delete-btn {
          opacity: 1;
        }
        
        .delete-btn:hover {
          background: rgba(255, 59, 48, 1);
          transform: scale(1.1);
        }
        
        .drag-hint {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 15px;
          border-radius: 10px;
          font-size: 0.9rem;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 1000;
          pointer-events: none;
        }
        
        .drag-hint.show {
          opacity: 1;
        }
        
        .gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 25px;
          min-height: 200px;
          padding: 20px;
          border-radius: 15px;
          background: rgba(102, 126, 234, 0.02);
        }
        
        @media (max-width: 768px) {
          .gallery {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 15px;
            padding: 15px;
          }
        }
        
        @media (max-width: 480px) {
          .gallery {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 12px;
            padding: 12px;
          }
        }
      `}</style>
      
      <div className="gallery" ref={gridRef}>
        <AnimatePresence>
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              data-id={image.id}
              className="image-item"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onMouseEnter={() => setHoveredId(image.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <img
                src={image.url}
                alt={image.name}
                draggable={false}
              />
              
              <div className="image-number">
                {index + 1}
              </div>
              
              {onEdit && (
                <button
                  className="edit-btn"
                  onClick={(e) => handleEdit(image.id, e)}
                  title="Edit Image"
                >
                  <Edit3 size={16} />
                </button>
              )}
              
              {onDelete && (
                <button
                  className="delete-btn"
                  onClick={(e) => handleDelete(image.id, e)}
                >
                  ×
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      <div className="drag-hint" ref={dragHintRef}>
        🎯 Drop here to reorder
      </div>
    </>
  );
});

export default ImageReorderGrid;