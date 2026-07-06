import ReactMarkdown from 'react-markdown'

const componentes = {
  p: (props) => <p className="mb-2 last:mb-0" {...props} />,
  ul: (props) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1" {...props} />,
  ol: (props) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1" {...props} />,
  li: (props) => <li {...props} />,
  strong: (props) => <strong className="font-semibold" {...props} />,
}

export default function MensagemMarkdown({ children }) {
  return <ReactMarkdown components={componentes}>{children}</ReactMarkdown>
}
