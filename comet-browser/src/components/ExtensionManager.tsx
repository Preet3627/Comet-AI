"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ToggleRight, ToggleLeft, ExternalLink, RefreshCw } from "lucide-react";

interface Extension {
  id: string;
  name: string;
  version: string;
  description: string;
  enabled: boolean;
  path: string;
}

const ExtensionManager = () => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExtensions = async () => {
    setLoading(true);
    if (window.electronAPI) {
      const fetchedExtensions = await window.electronAPI.getExtensions();
      setExtensions(fetchedExtensions);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExtensions();
  }, []);

  const handleToggleExtension = async (id: string) => {
    if (window.electronAPI) {
      const success = await window.electronAPI.toggleExtension(id);
      if (success !== undefined) {
        setExtensions((prev) =>
          prev.map((ext) =>
            ext.id === id ? { ...ext, enabled: success } : ext
          )
        );
      } else {
        // Fallback if return is void or error
        fetchExtensions();
      }
    }
  };

  const handleUninstallExtension = async (id: string) => {
    if (window.electronAPI) {
      await window.electronAPI.uninstallExtension(id);
      fetchExtensions();
    }
  };

  const handleOpenExtensionsFolder = async () => {
    if (window.electronAPI) {
      const path = await window.electronAPI.getExtensionPath();
      // In a real app, this would open the folder using shell.showItemInFolder
      alert(`Extensions folder: ${path}. You would open this in your file explorer.`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <RefreshCw className="animate-spin text-indigo-400" size={32} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-6 bg-zinc-800 rounded-lg shadow-xl"
    >
      <h2 className="text-2xl font-bold mb-6 text-white">Extension Manager</h2>

      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={handleOpenExtensionsFolder}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-lg text-sm font-semibold hover:bg-indigo-500/20 transition-colors"
        >
          <ExternalLink size={18} /> Open Extensions Folder
        </button>
        <button
          onClick={fetchExtensions}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-semibold transition-colors"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      <div className="space-y-4">
        {extensions.length === 0 ? (
          <div className="text-center text-gray-400 py-8 border border-dashed border-gray-700 rounded-lg">
            No extensions installed.
          </div>
        ) : (
          extensions.map((ext) => (
            <div
              key={ext.id}
              className="flex items-center justify-between bg-zinc-700 p-4 rounded-md shadow-sm"
            >
              <div className="text-left">
                <h3 className="text-lg font-semibold text-white">{ext.name}</h3>
                <p className="text-sm text-gray-400">{ext.description}</p>
                <p className="text-xs text-gray-500">Version: {ext.version}</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggleExtension(ext.id)}
                  className={`p-2 rounded-full transition-colors ${ext.enabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }`}
                  title={ext.enabled ? "Disable" : "Enable"}
                >
                  {ext.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
                <button
                  onClick={() => handleUninstallExtension(ext.id)}
                  className="p-2 rounded-full text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Uninstall"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default ExtensionManager;
