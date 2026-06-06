import React from 'react';

interface StatusBarProps {
  version: string;
  connectionStatus: 'connected' | 'disconnected' | 'syncing';
  lastSyncTime: Date | null;
  agentCount: number;
}

/**
 * アプリケーションの最下部に常駐するステータスバー。
 * バージョン情報、接続状態、アクティブなエージェント数、および最終同期日時をコンパクトに表示します。
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  version,
  connectionStatus,
  lastSyncTime,
  agentCount
}) => {
  // 接続ステータスに応じたインジケータ色とラベルを設定
  let statusColor = 'bg-slate-500';
  let statusText = 'unknown';

  if (connectionStatus === 'connected') {
    statusColor = 'bg-accent shadow-[0_0_8px_var(--color-accent)]';
    statusText = 'Connected';
  } else if (connectionStatus === 'syncing') {
    statusColor = 'bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]';
    statusText = 'Syncing';
  } else if (connectionStatus === 'disconnected') {
    statusColor = 'bg-alert shadow-[0_0_8px_var(--color-alert)]';
    statusText = 'Disconnected';
  }

  // 時間のフォーマット
  const formattedSyncTime = lastSyncTime 
    ? lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <footer 
      className="fixed bottom-0 left-0 right-0 h-[28px] bg-black/60 backdrop-blur-md border-t border-white/5 z-40 flex items-center justify-between px-4 text-[10px] font-mono text-slate-500 select-none no-drag"
      role="contentinfo"
    >
      {/* 左側: バージョン & 接続ステータス */}
      <div className="flex items-center gap-4">
        <span className="text-slate-400 font-bold">{version}</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
          <span className="capitalize">{statusText}</span>
        </div>
      </div>

      {/* 右側: エージェント状況 & 同期時間 */}
      <div className="flex items-center gap-4">
        <span>{agentCount} {agentCount === 1 ? 'Agent' : 'Agents'} Active</span>
        <span className="w-px h-3 bg-white/5" />
        <span>Last Sync: {formattedSyncTime}</span>
      </div>
    </footer>
  );
};
