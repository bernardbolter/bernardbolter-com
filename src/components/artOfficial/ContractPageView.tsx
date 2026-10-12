import type { ArtOfficialContract } from '@/lib/artOfficial/contract/types'

type Props = { contract: ArtOfficialContract }

export default function ContractPageView({ contract }: Props) {
  return (
    <article className="bio__content-container art-official-doc">
      <h1>{contract.title}</h1>
      <p>
        Contract version {contract['art-official:contractVersion']} · Protocol version{' '}
        {contract['art-official:protocolVersion']} · Generated{' '}
        {contract['art-official:generatedAt']}
      </p>
      <p>{contract['art-official:supersedesNote']}</p>

      <h2>reasoningStatus</h2>
      <p>{contract.reasoningStatusNote}</p>

      <h2>Coverage</h2>
      <p>{contract.coverageNote}</p>

      <h2>Endpoints</h2>
      <ul>
        {contract.endpoints.map((row) => (
          <li key={`${row.method}:${row.path}`}>
            <code>
              {row.method} {row.path}
            </code>
            — {row.role}
          </li>
        ))}
      </ul>

      <h2>Vision import</h2>
      <p>
        Key is <code>{contract.visionImport.key}</code>, not{' '}
        <code>{contract.visionImport.notKey}</code>. Entry fields:{' '}
        {contract.visionImport.entryFields.join(', ')}.
      </p>

      <h2>Envelope — top level</h2>
      <FieldTable rows={contract.envelope.topLevel} />

      <h2>Envelope — sessionType map</h2>
      <ul>
        {Object.entries(contract.envelope.sessionTypeMap).map(([from, to]) => (
          <li key={from}>
            <code>{from}</code> → <code>{to}</code>
          </li>
        ))}
      </ul>

      {contract.envelope.collections.map((col) => (
        <section key={col.collection}>
          <h2>
            Collection <code>{col.collection}</code> ({col.operation})
          </h2>
          <h3>Write object keys</h3>
          <FieldTable rows={col.topLevelKeys} />
          <h3>Fields</h3>
          <FieldTable rows={col.fields} />
        </section>
      ))}

      <h2>Artwork forbidden paths</h2>
      <p>{contract.artworkForbiddenNotes.join(' ')}</p>
      <ul>
        {contract.artworkForbidden.map((path) => (
          <li key={path}>
            <code>{path}</code>
          </li>
        ))}
      </ul>

      <h2>Allowed provenance cluster</h2>
      <ul>
        {contract.artworkAllowedProvenance.map((name) => (
          <li key={name}>
            <code>{name}</code>
          </li>
        ))}
      </ul>

      <h2>artHistoricalReferences</h2>
      <p>
        <code>{contract.artHistoricalReferencesShape}</code>
      </p>

      <h2>Explicit rejections</h2>
      <ul>
        {contract.rejections.map((row) => (
          <li key={`${row.keyOrField}:${row.where}`}>
            <strong>{row.keyOrField}</strong> — {row.behaviour} at <code>{row.where}</code>:{' '}
            {row.why}
          </li>
        ))}
      </ul>

      <h2>Worked example envelope</h2>
      <p>
        This example validates under the live Zod schema. It does not include{' '}
        <code>reasoningStatus</code>.
      </p>
      <pre className="art-official-doc__pre">
        {JSON.stringify(contract.workedExampleEnvelope, null, 2)}
      </pre>
    </article>
  )
}

function FieldTable({ rows }: { rows: ArtOfficialContract['envelope']['topLevel'] }) {
  return (
    <table className="art-official-doc__table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Required</th>
          <th>Enum</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td>
              <code>{row.name}</code>
            </td>
            <td>{row.type}</td>
            <td>{row.required ? 'yes' : 'optional'}</td>
            <td>{row.enumValues ? row.enumValues.join(' | ') : '—'}</td>
            <td>{row.notes || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
