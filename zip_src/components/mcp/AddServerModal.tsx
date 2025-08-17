/**
 * Add MCP Server Modal
 * 
 * Modal form for adding new MCP servers to the playground.
 * Supports npm packages, Docker images, and custom executables.
 */

import React, { useState } from 'react';
import { AddServerFormData } from '../../services/mcp/types';
import { useMcpServerManagementStore } from '../../stores/mcpServerManagementStore';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddServerModal: React.FC<AddServerModalProps> = ({ isOpen, onClose }) => {
  const { addServer } = useMcpServerManagementStore();
  
  const [formData, setFormData] = useState<AddServerFormData>({
    name: '',
    type: 'npm',
    packageName: '',
    dockerImage: '',
    execPath: '',
    args: [],
    description: '',
    tags: []
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Server name is required');
      }
      
      if (formData.type === 'npm' && !formData.packageName?.trim()) {
        throw new Error('Package name is required for npm servers');
      }
      
      if (formData.type === 'docker' && !formData.dockerImage?.trim()) {
        throw new Error('Docker image is required for Docker servers');
      }
      
      if (formData.type === 'custom' && !formData.execPath?.trim()) {
        throw new Error('Executable path is required for custom servers');
      }
      
      await addServer(formData);
      
      // Reset form and close modal
      setFormData({
        name: '',
        type: 'npm',
        packageName: '',
        dockerImage: '',
        execPath: '',
        args: [],
        description: '',
        tags: []
      });
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArgsChange = (value: string) => {
    const args = value.split(' ').filter(arg => arg.trim());
    setFormData(prev => ({ ...prev, args }));
  };

  const handleTagsChange = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({ ...prev, tags }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add MCP Server</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="add-server-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {/* Basic Info */}
          <div className="form-group">
            <label htmlFor="name">Server Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Sequential Thinking"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this server does"
              rows={3}
            />
          </div>
          
          {/* Server Type */}
          <div className="form-group">
            <label htmlFor="type">Server Type *</label>
            <select
              id="type"
              value={formData.type}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                type: e.target.value as 'npm' | 'docker' | 'custom' 
              }))}
            >
              <option value="npm">NPM Package</option>
              <option value="docker">Docker Image</option>
              <option value="custom">Custom Executable</option>
            </select>
          </div>
          
          {/* Type-specific fields */}
          {formData.type === 'npm' && (
            <div className="form-group">
              <label htmlFor="packageName">Package Name *</label>
              <input
                id="packageName"
                type="text"
                value={formData.packageName}
                onChange={e => setFormData(prev => ({ ...prev, packageName: e.target.value }))}
                placeholder="e.g., @modelcontextprotocol/server-sequential-thinking"
                required
              />
              <small className="form-help">
                The npm package name (will be run with npx)
              </small>
            </div>
          )}
          
          {formData.type === 'docker' && (
            <div className="form-group">
              <label htmlFor="dockerImage">Docker Image *</label>
              <input
                id="dockerImage"
                type="text"
                value={formData.dockerImage}
                onChange={e => setFormData(prev => ({ ...prev, dockerImage: e.target.value }))}
                placeholder="e.g., my-org/mcp-server:latest"
                required
              />
              <small className="form-help">
                The Docker image name and tag
              </small>
            </div>
          )}
          
          {formData.type === 'custom' && (
            <>
              <div className="form-group">
                <label htmlFor="execPath">Executable Path *</label>
                <input
                  id="execPath"
                  type="text"
                  value={formData.execPath}
                  onChange={e => setFormData(prev => ({ ...prev, execPath: e.target.value }))}
                  placeholder="e.g., /usr/local/bin/my-mcp-server"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="args">Arguments</label>
                <input
                  id="args"
                  type="text"
                  value={formData.args?.join(' ') || ''}
                  onChange={e => handleArgsChange(e.target.value)}
                  placeholder="e.g., --port 3000 --config /path/to/config"
                />
                <small className="form-help">
                  Space-separated command line arguments
                </small>
              </div>
            </>
          )}
          
          {/* Tags */}
          <div className="form-group">
            <label htmlFor="tags">Tags</label>
            <input
              id="tags"
              type="text"
              value={formData.tags?.join(', ') || ''}
              onChange={e => handleTagsChange(e.target.value)}
              placeholder="e.g., ai, reasoning, experimental"
            />
            <small className="form-help">
              Comma-separated tags for organization
            </small>
          </div>
          
          {/* Actions */}
          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddServerModal;