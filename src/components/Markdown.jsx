import ReactMarkdown from 'react-markdown'

const componentes = {
  h1: (props) => <h2 className="text-2xl font-semibold text-stone-800 mt-6 mb-3" {...props} />,
  h2: (props) => <h3 className="text-xl font-semibold text-stone-800 mt-6 mb-3" {...props} />,
  h3: (props) => <h4 className="text-lg font-semibold text-stone-800 mt-5 mb-2" {...props} />,
  p: (props) => <p className="mb-4 leading-relaxed" {...props} />,
  ul: (props) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
  ol: (props) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  strong: (props) => <strong className="font-semibold text-stone-900" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-4 border-amber-700/40 pl-4 italic text-stone-600 mb-4" {...props} />
  ),
}

export default function Markdown({ children }) {
  return (
    <div className="text-stone-700 text-lg">
      <ReactMarkdown components={componentes}>{children}</ReactMarkdown>
    </div>
  )
}
