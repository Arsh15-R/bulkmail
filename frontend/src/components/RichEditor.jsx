import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Link as LinkIcon,
  Code,
  Tag,
  Type,
  Eye,
  Check
} from 'lucide-react';

export const RichEditor = ({
  htmlValue = '',
  onChangeHtml,
  textValue = '',
  onChangeText,
  placeholders = ['name', 'email', 'order_id']
}) => {
  const [activeTab, setActiveTab] = useState('rich'); // 'rich', 'html', 'plain'
  const editorRef = useRef(null);
  const isInternalUpdate = useRef(false);
  const [copiedPh, setCopiedPh] = useState(null);

  // Sync incoming htmlValue into editable div when in rich mode
  useEffect(() => {
    if (editorRef.current && activeTab === 'rich') {
      if (!isInternalUpdate.current && editorRef.current.innerHTML !== htmlValue) {
        editorRef.current.innerHTML = htmlValue || '<p><br></p>';
      }
    }
    isInternalUpdate.current = false;
  }, [htmlValue, activeTab]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalUpdate.current = true;
      const html = editorRef.current.innerHTML;
      onChangeHtml(html);
      // Generate plain text automatically if not explicitly edited
      if (!textValue || textValue.trim().length === 0) {
        const plain = editorRef.current.innerText;
        onChangeText(plain);
      }
    }
  };

  const execCmd = (command, value = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      handleInput();
    }
  };

  const insertPlaceholder = (ph) => {
    const token = `{{${ph}}}`;
    if (activeTab === 'rich' && editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertText', false, token);
      handleInput();
    } else if (activeTab === 'html') {
      onChangeHtml(htmlValue + token);
    } else {
      onChangeText(textValue + token);
    }

    setCopiedPh(ph);
    setTimeout(() => setCopiedPh(null), 1500);
  };

  const handlePromptLink = () => {
    const url = prompt('Enter hyperlink URL:', 'https://');
    if (url) {
      execCmd('createLink', url);
    }
  };

  return (
    <div className="border border-border rounded-panel overflow-hidden bg-surface shadow-resting transition-colors">
      {/* Editor Header Bar with Toolbar & Tabs */}
      <div className="bg-surface-muted/70 border-b border-border-subtle px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Formatting Toolbar (shown in Rich mode) */}
        {activeTab === 'rich' ? (
          <div className="flex items-center space-x-0.5">
            <button
              type="button"
              onClick={() => execCmd('bold')}
              title="Bold (Ctrl+B)"
              className="p-1.5 rounded-control text-text-secondary hover:text-foreground hover:bg-surface transition-colors"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('italic')}
              title="Italic (Ctrl+I)"
              className="p-1.5 rounded-control text-text-secondary hover:text-foreground hover:bg-surface transition-colors"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('underline')}
              title="Underline (Ctrl+U)"
              className="p-1.5 rounded-control text-text-secondary hover:text-foreground hover:bg-surface transition-colors"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-3.5 bg-border-strong mx-1" />

            <button
              type="button"
              onClick={() => execCmd('formatBlock', '<h1>')}
              title="Heading 1"
              className="p-1.5 rounded-control text-text-secondary hover:text-foreground hover:bg-surface transition-colors"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('formatBlock', '<h2>')}
              title="Heading 2"
              className="p-1.5 rounded-control text-text-secondary hover:text-foreground hover:bg-surface transition-colors"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-3.5 bg-border-strong mx-1" />

            <button
              type="button"
              onClick={() => execCmd('insertUnorderedList')}
              title="Bullet List"
              className="p-1.5 rounded-control text-text-secondary hover:text-foreground hover:bg-surface transition-colors"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('insertOrderedList')}
              title="Numbered List"
              className="p-1.5 rounded-control text-text-secondary hover:text-foreground hover:bg-surface transition-colors"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-3.5 bg-border-strong mx-1" />

            <button
              type="button"
              onClick={handlePromptLink}
              title="Insert Link"
              className="p-1.5 rounded-control text-text-secondary hover:text-foreground hover:bg-surface transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-[11px] font-medium text-text-muted py-1 flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>
              {activeTab === 'html'
                ? 'Direct HTML source mode'
                : 'Plain-text fallback mode'}
            </span>
          </div>
        )}

        {/* Mode Switch Tabs with Gliding Active Pill */}
        <div className="relative flex items-center bg-surface border border-border-subtle p-0.5 rounded-control text-xs">
          {[
            { id: 'rich', label: 'Visual', icon: null },
            { id: 'html', label: 'HTML', icon: Code },
            { id: 'plain', label: 'Plain Text', icon: Type }
          ].map((tab) => {
            const isTabActive = activeTab === tab.id;
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-2.5 py-1 rounded-[calc(var(--radius-control)-2px)] font-medium text-xs transition-colors flex items-center space-x-1 z-10 ${
                  isTabActive
                    ? 'text-foreground font-semibold'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                {isTabActive && (
                  <motion.div
                    layoutId="editor-active-tab-pill"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    className="absolute inset-0 bg-surface-muted rounded-[calc(var(--radius-control)-2px)] shadow-xs"
                    style={{ zIndex: -1 }}
                  />
                )}
                {TabIcon && <TabIcon className="w-3 h-3" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Placeholders Toolbar */}
      {placeholders.length > 0 && (
        <div className="bg-surface-muted/40 px-3.5 py-2 border-b border-border-subtle flex items-center flex-wrap gap-1.5 text-xs">
          <span className="text-text-muted flex items-center mr-1 text-[11px] font-medium">
            <Tag className="w-3 h-3 mr-1 text-accent" /> Insert Placeholder:
          </span>
          {placeholders.map((ph) => {
            const isJustCopied = copiedPh === ph;
            return (
              <button
                key={ph}
                type="button"
                onClick={() => insertPlaceholder(ph)}
                className={`px-2 py-0.5 rounded-pill border text-[11px] font-mono font-medium transition-all flex items-center space-x-1 ${
                  isJustCopied
                    ? 'bg-success/15 border-success text-success scale-95'
                    : 'bg-surface border-border text-accent hover:border-accent hover:bg-accent-subtle/50'
                }`}
              >
                <span>{`{{${ph}}}`}</span>
                {isJustCopied && <Check className="w-2.5 h-2.5 ml-0.5" />}
              </button>
            );
          })}
          <span className="text-[11px] text-text-muted italic ml-auto hidden sm:inline">
            Supports fallbacks: <code className="text-foreground">{`{{name|there}}`}</code>
          </span>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="p-4 min-h-[260px] bg-surface">
        {activeTab === 'rich' && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            className="prose dark:prose-invert max-w-none focus:outline-none min-h-[240px] text-foreground text-sm leading-relaxed"
            style={{ minHeight: '240px' }}
          />
        )}

        {activeTab === 'html' && (
          <textarea
            value={htmlValue}
            onChange={(e) => onChangeHtml(e.target.value)}
            rows={12}
            className="w-full font-mono text-xs bg-neutral-11 text-emerald-400 p-3.5 rounded-control focus:outline-none focus:ring-1 focus:ring-accent resize-y border border-border"
            placeholder="<html><body><p>Write raw HTML content...</p></body></html>"
          />
        )}

        {activeTab === 'plain' && (
          <div className="space-y-2">
            <textarea
              value={textValue}
              onChange={(e) => onChangeText(e.target.value)}
              rows={10}
              className="w-full font-sans text-xs bg-surface-muted/50 border border-border p-3.5 rounded-control focus:outline-none focus:ring-1 focus:ring-accent text-foreground resize-y"
              placeholder="Plain text fallback for legacy or text-only clients..."
            />
            <p className="text-[11px] text-text-muted">
              Transmitted alongside HTML as multi-part MIME payload for optimal deliverability.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
