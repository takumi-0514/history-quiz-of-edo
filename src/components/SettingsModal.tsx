import React, { useState, useEffect } from 'react';
import { StudySubject } from '../types';
import {
  checkSyncStatus,
  connectStudyTracker,
  disconnectStudyTracker,
  fetchStudyTrackerSubjects,
} from '../services/studyTracker';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncStatusChanged: (isConnected: boolean) => void;
  onShowAlert: (title: string, message: string, iconClass?: string, iconColorClass?: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSyncStatusChanged,
  onShowAlert,
}) => {
  const [roomId, setRoomId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [subjects, setSubjects] = useState<StudySubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const status = checkSyncStatus();
      setIsConnected(status.isConnected);
      setRoomId(status.roomId);
      setPassword(status.password);
      if (status.isConnected) {
        fetchStudyTrackerSubjects().then(list => {
          setSubjects(list);
          const saved = localStorage.getItem('history_st_sync_subject') || (list[0]?.id || '');
          setSelectedSubject(saved);
        });
      }
    }
  }, [isOpen]);

  const handleConnect = async () => {
    if (!roomId.trim() || !password.trim()) {
      onShowAlert('入力エラー', 'ルームIDとパスワードの両方を入力してください。', 'fa-circle-exclamation', 'text-amber-600');
      return;
    }

    setIsConnecting(true);
    const res = await connectStudyTracker(roomId.trim(), password.trim());
    setIsConnecting(false);

    if (res.success) {
      setIsConnected(true);
      onSyncStatusChanged(true);
      if (res.subjects) {
        setSubjects(res.subjects);
        let savedSub = localStorage.getItem('history_st_sync_subject');
        if (!savedSub) {
          const histSub = res.subjects.find(s => s.name === '歴史' || s.name === '社会');
          savedSub = histSub ? histSub.id : (res.subjects[0]?.id || '');
          if (savedSub) localStorage.setItem('history_st_sync_subject', savedSub);
        }
        setSelectedSubject(savedSub);
      }
      onShowAlert('接続完了', 'Study Trackerと連携しました！', 'fa-circle-check', 'text-green-600');
    } else {
      onShowAlert('連携エラー', res.message || '接続に失敗しました。', 'fa-circle-xmark', 'text-red-500');
    }
  };

  const handleDisconnect = () => {
    disconnectStudyTracker();
    setIsConnected(false);
    setRoomId('');
    setPassword('');
    setSubjects([]);
    setSelectedSubject('');
    onSyncStatusChanged(false);
    onShowAlert('解除完了', 'Study Trackerとの連携を解除しました。', 'fa-circle-info', 'text-stone-600');
  };

  const handleSubjectChange = (val: string) => {
    setSelectedSubject(val);
    localStorage.setItem('history_st_sync_subject', val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <i className="fa-solid fa-gear text-amber-700"></i> 設定
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-amber-900 mb-2.5 flex items-center justify-between text-xs tracking-wider uppercase">
              <span className="flex items-center gap-1.5">
                <i className="fa-solid fa-cloud-arrow-up"></i> Study Tracker 連携
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isConnected
                    ? 'text-emerald-700 bg-emerald-100'
                    : 'text-stone-500 bg-stone-200'
                }`}
              >
                {isConnected ? '連携済み' : '未連携'}
              </span>
            </h3>

            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 shadow-inner">
              <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                Study Trackerの「同期ルームID」と「暗号化パスワード」を入力すると、学習時間を自動で記録できます。
              </p>

              {!isConnected ? (
                <div>
                  <div className="flex flex-col gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="ルームID"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 bg-white"
                    />
                    <input
                      type="password"
                      placeholder="パスワード"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isConnecting}
                    onClick={handleConnect}
                    className="w-full py-2 px-3 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-lg text-sm font-bold shadow transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isConnecting ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i> 接続中...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-link"></i> 連携する
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-3">
                    <label className="block text-[10px] text-stone-500 mb-1 font-bold">
                      記録先の科目
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-amber-500 bg-white cursor-pointer shadow-sm"
                    >
                      {subjects.length > 0 ? (
                        subjects.map(sub => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))
                      ) : (
                        <option value="">科目がありません</option>
                      )}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="w-full py-2 px-3 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-link-slash"></i> 連携を解除
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-stone-800 hover:bg-stone-900 text-white font-bold py-2.5 px-5 rounded-lg shadow transition-colors text-sm cursor-pointer"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
