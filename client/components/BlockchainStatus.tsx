import React from "react";
import { motion } from "framer-motion";
import { Shield, Zap, Lock, Cpu } from "lucide-react";

export default function BlockchainStatus() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed bottom-6 right-6 z-40"
    >
      <motion.div
        className="bg-gray-900/60 backdrop-blur-md border border-gray-800/50 rounded-full px-4 py-2 text-white shadow-lg"
        whileHover={{ scale: 1.02, bg: "rgba(17, 24, 39, 0.8)" }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center space-x-3">
          {/* Live Status Indicator */}
          <div className="flex items-center space-x-2">
            <motion.div
              className="w-2 h-2 bg-green-400 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-xs font-medium text-gray-300">Live</span>
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-gray-700" />

          {/* Security Status */}
          <div className="flex items-center space-x-1">
            <Shield className="h-3 w-3 text-blue-400" />
            <span className="text-xs text-gray-400">Secured</span>
          </div>

          {/* Divider */}
          <div className="w-px h-4 bg-gray-700" />

          {/* AI Status */}
          <div className="flex items-center space-x-1">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Cpu className="h-3 w-3 text-cyan-400" />
            </motion.div>
            <span className="text-xs text-gray-400">AI Ready</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
