import PropTypes from 'prop-types';

export default function KioskFeedbackPanel({ status, lastEvent }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '12px',
        right: '12px',
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        color: '#fff',
        padding: '10px 12px',
        borderRadius: '8px',
        minWidth: '220px',
        fontSize: '14px',
        lineHeight: 1.4,
      }}
    >
      <div>
        <strong>WebSocket:</strong> {status}
      </div>

      {lastEvent ? (
        <>
          <div style={{ marginTop: '8px' }}>
            <strong>Source:</strong> {lastEvent.source || 'unknown'}
          </div>
          <div>
            <strong>Type:</strong> {lastEvent.type || 'unknown'}
          </div>
          <div style={{ marginTop: '8px' }}>
            <strong>Payload:</strong>
          </div>
          <pre
            style={{
              margin: '4px 0 0 0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '12px',
            }}
          >
            {JSON.stringify(lastEvent.payload || {}, null, 2)}
          </pre>
        </>
      ) : (
        <div style={{ marginTop: '8px' }}>No events received yet</div>
      )}
    </div>
  );
}

KioskFeedbackPanel.propTypes = {
  status: PropTypes.string.isRequired,
  lastEvent: PropTypes.shape({
    source: PropTypes.string,
    type: PropTypes.string,
    payload: PropTypes.object,
  }),
};

KioskFeedbackPanel.defaultProps = {
  lastEvent: null,
};