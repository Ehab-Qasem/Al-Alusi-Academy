
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Quote, Undo, Redo, Type, Highlighter, RemoveFormatting } from 'lucide-react';
import { Extension } from '@tiptap/core';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';

const TextDirection = Extension.create({
  name: 'textDirection',
  addOptions() {
    return { types: ['heading', 'paragraph'], defaultDirection: 'rtl' };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dir: {
            default: null,
            parseHTML: element => element.dir || element.style.direction || null,
            renderHTML: attributes => {
              if (!attributes.dir) return {};
              return { dir: attributes.dir };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextDirection: (direction: string) => ({ commands }) => {
        return this.options.types.every((type: string) => commands.updateAttributes(type, { dir: direction }));
      },
    };
  },
});

interface Props {
    content: string;
    onChange: (content: string) => void;
    editable?: boolean;
}

const MenuBar = ({ editor }: { editor: any }) => {
    if (!editor) {
        return null;
    }

    const addImage = () => {
        const url = window.prompt('URL رابط الصورة:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    };

    const setLink = () => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL الرابط:', previousUrl);

        // cancelled
        if (url === null) {
            return;
        }

        // empty
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        // update link
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    };

    return (
        <div className="border-b border-gray-200 dark:border-slate-700 p-2 flex flex-wrap gap-1 bg-gray-50 dark:bg-slate-800 rounded-t-xl">
            <div className="flex gap-1 border-l border-gray-300 dark:border-slate-600 pl-2 ml-2">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="Bold"
                >
                    <Bold size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="Italic"
                >
                    <Italic size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive('underline') ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="Underline"
                >
                    <UnderlineIcon size={16} />
                </button>
            </div>

            <div className="flex gap-1 border-l border-gray-300 dark:border-slate-600 pl-2 ml-2">
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="H1"
                >
                    <Heading1 size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="H2"
                >
                    <Heading2 size={16} />
                </button>
            </div>

            <div className="flex gap-1 border-l border-gray-300 dark:border-slate-600 pl-2 ml-2">
                <button
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="Align Right"
                >
                    <AlignRight size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="Align Center"
                >
                    <AlignCenter size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="Align Left"
                >
                    <AlignLeft size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextDirection('rtl').run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive({ dir: 'rtl' }) ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="RTL Direction"
                >
                    <span className="text-[12px] font-bold px-1">RTL</span>
                </button>
                <button
                    onClick={() => editor.chain().focus().setTextDirection('ltr').run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive({ dir: 'ltr' }) ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="LTR Direction"
                >
                    <span className="text-[12px] font-bold px-1">LTR</span>
                </button>
            </div>

            <div className="flex gap-1 border-l border-gray-300 dark:border-slate-600 pl-2 ml-2 items-center">
                <div className="relative group flex items-center">
                    <Type size={16} className="text-gray-600 dark:text-gray-300 mr-1" />
                    <input
                        type="color"
                        onInput={(event: any) => editor.chain().focus().setColor(event.target.value).run()}
                        value={editor.getAttributes('textStyle').color || '#000000'}
                        className="w-5 h-5 p-0 border-0 rounded cursor-pointer"
                        title="Text Color"
                    />
                </div>
                <div className="relative group flex items-center ml-1">
                    <Highlighter size={16} className="text-gray-600 dark:text-gray-300 mr-1" />
                    <input
                        type="color"
                        onInput={(event: any) => editor.chain().focus().toggleHighlight({ color: event.target.value }).run()}
                        value={editor.getAttributes('highlight').color || '#ffff00'}
                        className="w-5 h-5 p-0 border-0 rounded cursor-pointer"
                        title="Highlight Color"
                    />
                </div>
                <button
                    onClick={() => editor.chain().focus().unsetHighlight().run()}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-600 dark:text-gray-300"
                    title="Clear Highlight"
                >
                    <RemoveFormatting size={16} />
                </button>
            </div>

            <div className="flex gap-1 border-l border-gray-300 dark:border-slate-600 pl-2 ml-2">
                <button
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="Bullet List"
                >
                    <List size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="Ordered List"
                >
                    <ListOrdered size={16} />
                </button>
            </div>

            <div className="flex gap-1 border-l border-gray-300 dark:border-slate-600 pl-2 ml-2">
                <button
                    onClick={setLink}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive('link') ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="Link"
                >
                    <LinkIcon size={16} />
                </button>
                <button
                    onClick={addImage}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-600 dark:text-gray-300"
                    title="Image"
                >
                    <ImageIcon size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition ${editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-slate-700 text-primary-600' : 'text-gray-600 dark:text-gray-300'}`}
                    title="Quote"
                >
                    <Quote size={16} />
                </button>
            </div>

            <div className="flex-1"></div>

            <div className="flex gap-1">
                <button
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-400 disabled:opacity-50"
                    title="Undo"
                >
                    <Undo size={16} />
                </button>
                <button
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition text-gray-400 disabled:opacity-50"
                    title="Redo"
                >
                    <Redo size={16} />
                </button>
            </div>
        </div>
    );
};

const extensions = [
    StarterKit,
    Underline,
    Link.configure({
        openOnClick: false,
    }),
    Image,
    TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'right', // Default RTL
    }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    TextDirection,
];

const RichTextEditor = ({ content, onChange, editable = true }: Props) => {
    const editor = useEditor({
        extensions,
        content,
        editable,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4 text-sm',
            },
        },
    });

    if (!editable) {
        return <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: content }} />;
    }

    return (
        <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 transition focus-within:ring-2 ring-primary-500">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;
