import { localDb } from '@/lib/localDb';

export default function SourceLibraryPage() {
  const sources = localDb.listSourceRecords();

  return (
    <div>
      <h1 className="title">Source Library</h1>
      <p className="subtitle">
        Official-source anchors used by the wizard abstraction, gate evaluation, and export manifest.
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Packet Role</th>
            <th>Verification</th>
            <th>Fingerprint</th>
            <th>Verified At</th>
            <th>Last Seen</th>
            <th>Stale</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((src) => (
            <tr key={src.id}>
              <td>{src.title}</td>
              <td>{src.packetRole}</td>
              <td>{src.verificationStatus}</td>
              <td>
                <span className="code">{src.fingerprintHash}</span>
              </td>
              <td>{src.verifiedAt}</td>
              <td>{src.lastSeenAt}</td>
              <td>{src.stale ? 'yes' : 'no'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
