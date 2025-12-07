import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '../ui/button';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

interface ClauseEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export function ClauseEditor({
  content,
  onChange,
  placeholder = 'Digite as cláusulas do contrato...',
  readOnly = false,
  className,
}: ClauseEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    active,
    disabled,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-8 w-8 p-0 touch-manipulation',
        active && 'bg-muted text-foreground'
      )}
      title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {!readOnly && (
        <>
          {/* Desktop Toolbar */}
          <div className="hidden sm:flex border-b bg-muted/30 p-2 flex-wrap gap-1">
            {/* Text Style */}
            <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
                title="Negrito (Ctrl+B)"
              >
                <Bold className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
                title="Itálico (Ctrl+I)"
              >
                <Italic className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                active={editor.isActive('underline')}
                title="Sublinhado (Ctrl+U)"
              >
                <UnderlineIcon className="w-4 h-4" />
              </ToolbarButton>
            </div>

            {/* Headings */}
            <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                active={editor.isActive('heading', { level: 1 })}
                title="Título 1"
              >
                <Heading1 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                title="Título 2"
              >
                <Heading2 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive('heading', { level: 3 })}
                title="Título 3"
              >
                <Heading3 className="w-4 h-4" />
              </ToolbarButton>
            </div>

            {/* Lists */}
            <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive('bulletList')}
                title="Lista com marcadores"
              >
                <List className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive('orderedList')}
                title="Lista numerada"
              >
                <ListOrdered className="w-4 h-4" />
              </ToolbarButton>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-0.5 border-r pr-2 mr-2">
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                active={editor.isActive({ textAlign: 'left' })}
                title="Alinhar à esquerda"
              >
                <AlignLeft className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                active={editor.isActive({ textAlign: 'center' })}
                title="Centralizar"
              >
                <AlignCenter className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                active={editor.isActive({ textAlign: 'right' })}
                title="Alinhar à direita"
              >
                <AlignRight className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                active={editor.isActive({ textAlign: 'justify' })}
                title="Justificar"
              >
                <AlignJustify className="w-4 h-4" />
              </ToolbarButton>
            </div>

            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5">
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Desfazer (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Refazer (Ctrl+Y)"
              >
                <Redo className="w-4 h-4" />
              </ToolbarButton>
            </div>
          </div>

          {/* Mobile Toolbar */}
          <div className="flex sm:hidden border-b bg-muted/30 p-2 gap-1 overflow-x-auto">
            {/* Essential formatting buttons visible on mobile */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="Negrito"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="Itálico"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Desfazer"
            >
              <Undo className="w-4 h-4" />
            </ToolbarButton>

            {/* More options dropdown for mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleUnderline().run()}>
                  <UnderlineIcon className="w-4 h-4 mr-2" />
                  Sublinhado
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                  <Heading1 className="w-4 h-4 mr-2" />
                  Título 1
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                  <Heading2 className="w-4 h-4 mr-2" />
                  Título 2
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                  <Heading3 className="w-4 h-4 mr-2" />
                  Título 3
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                  <ListOrdered className="w-4 h-4 mr-2" />
                  Lista numerada
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('left').run()}>
                  <AlignLeft className="w-4 h-4 mr-2" />
                  Alinhar esquerda
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('center').run()}>
                  <AlignCenter className="w-4 h-4 mr-2" />
                  Centralizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('right').run()}>
                  <AlignRight className="w-4 h-4 mr-2" />
                  Alinhar direita
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
                  <AlignJustify className="w-4 h-4 mr-2" />
                  Justificar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                >
                  <Redo className="w-4 h-4 mr-2" />
                  Refazer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}

      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none p-3 sm:p-4 min-h-[200px] sm:min-h-[300px] focus:outline-none',
          '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[180px] sm:[&_.ProseMirror]:min-h-[280px]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
          readOnly && 'bg-muted/20'
        )}
      />
    </div>
  );
}

export default ClauseEditor;
