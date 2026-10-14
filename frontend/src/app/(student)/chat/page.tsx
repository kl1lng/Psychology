'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Phone, User, Clock, MessageSquare, Calendar } from 'lucide-react';
import { LogoIcon } from '@/components/ui/logo-icon';
import { chatApi, appointmentsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { ChatMessage, DialogStatus, Dialog } from '@/types/chat';
import { formatTime } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { playNotificationChime } from '@/lib/sound-alerts';

export default function ChatPage() {
  const { lang, t } = useLanguage();
  const [dialogId, setDialogId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<DialogStatus>('BOT');
  const [typing, setTyping] = useState(false);
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, quickActions]);

  const getStudentId = useCallback(() => {
    if (typeof window === 'undefined') return undefined;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id || localStorage.getItem('guest_id') || undefined;
  }, []);

  // ─── 1. Load initial chat history on mount ──────────────────────────────────
  useEffect(() => {
    const studentId = getStudentId();
    if (!studentId) return;

    chatApi.getHistory(studentId)
      .then((res) => {
        const data = res.data as Dialog;
        if (data) {
          if (data.id) setDialogId(data.id);
          if (data.status) setStatus(data.status);
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        }
      })
      .catch(() => {
        // If no active dialog exists yet, that's completely normal
      });
  }, [getStudentId]);

  // ─── 2. Supabase Realtime Subscription ───────────────────────────────────────
  useEffect(() => {
    if (!dialogId) return;

    const channel = supabase
      .channel(`student-dialog:${dialogId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `dialog_id=eq.${dialogId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setTyping(false);
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            const optimisticIndex = prev.findIndex(
              (m) =>
                m.sender_role === newMsg.sender_role &&
                m.content === newMsg.content &&
                m.id.startsWith('temp_')
            );
            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = newMsg;
              return updated;
            }

            if (newMsg.sender_role === 'PSYCHOLOGIST' || newMsg.sender_role === 'BOT') {
              playNotificationChime();
            }

            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dialogs',
          filter: `id=eq.${dialogId}`,
        },
        (payload) => {
          const updatedDialog = payload.new as Dialog;
          if (updatedDialog?.status) {
            setStatus(updatedDialog.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dialogId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);
    setQuickActions([]);

    const tempId = `temp_${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      dialog_id: dialogId || '',
      sender_role: 'STUDENT',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTyping(true);

    try {
      const res = await chatApi.sendMessage(content, getStudentId());
      const { dialog_id: resDialogId, reply, status: newStatus, quick_actions } = res.data;
      if (resDialogId && resDialogId !== dialogId) {
        setDialogId(resDialogId);
      }
      if (newStatus) {
        setStatus(newStatus);
      }
      if (quick_actions && quick_actions.length > 0) {
        setQuickActions(quick_actions);
      }

      if (reply) {
        setTimeout(() => {
          setTyping(false);
          setMessages((prev) => {
            if (prev.some((m) => m.content === reply && (m.sender_role === 'BOT' || m.sender_role === 'PSYCHOLOGIST'))) {
              return prev;
            }
            return [
              ...prev,
              {
                id: `bot_${Date.now()}`,
                dialog_id: resDialogId || dialogId || '',
                sender_role: 'BOT',
                content: reply,
                created_at: new Date().toISOString(),
              },
            ];
          });
        }, 600);
      }
    } catch {
      setTyping(false);
    } finally {
      setSending(false);
    }
  }

  async function handleQuickAction(actionText: string) {
    setQuickActions([]);
    const isAppointmentAction =
      actionText.includes('жазылу') ||
      actionText.includes('записаться') ||
      actionText.includes('психолог');

    const tempId = `act_${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      dialog_id: dialogId || '',
      sender_role: 'STUDENT',
      content: actionText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTyping(true);

    if (isAppointmentAction) {
      try {
        const studentId = getStudentId();
        const res = await appointmentsApi.book({ student_id: studentId, lang });
        setStatus('WAITING_PSYCHOLOGIST');
        const replyMsg = res.data.message;

        setTimeout(() => {
          setTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `bot_app_${Date.now()}`,
              dialog_id: dialogId || '',
              sender_role: 'BOT',
              content: replyMsg,
              created_at: new Date().toISOString(),
            },
          ]);
        }, 600);
      } catch (err) {
        setTyping(false);
        console.error(err);
      }
    } else {
      // Regular message
      setInput(actionText);
      setSending(false);
      setTyping(false);
    }
  }

  async function callPsychologist() {
    try {
      const res = await chatApi.callPsychologist(getStudentId());
      if (res.data?.dialog_id) {
        setDialogId(res.data.dialog_id);
      }
      setStatus('WAITING_PSYCHOLOGIST');
      const reqMsg =
        t.chatPage?.requestSent ||
        (lang === 'kk'
          ? 'Психологқа сұраныс жіберілді. Маман жақын арада қосылады.'
          : 'Запрос психологу отправлен. Специалист подключится в ближайшее время.');
      
      setMessages((prev) => [
        ...prev,
        {
          id: `req_${Date.now()}`,
          dialog_id: dialogId || '',
          sender_role: 'BOT',
          content: reqMsg,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col h-full flex-1 min-h-0 w-full">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 mb-2 flex justify-between items-center gap-2 w-full shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/40 shrink-0">
            <LogoIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <div className="text-zinc-900 dark:text-white font-semibold text-sm sm:text-base truncate">
              {t.chatPage?.assistantTitle || (lang === 'kk' ? 'Психологиялық ассистент' : 'Психологический ассистент')}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                status === 'BOT' ? 'bg-emerald-500' :
                status === 'WAITING_PSYCHOLOGIST' ? 'bg-amber-500 animate-pulse' :
                'bg-indigo-500'
              }`} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {status === 'BOT' && (t.chatPage?.botOnline || (lang === 'kk' ? 'Бот онлайн' : 'Бот онлайн'))}
                {status === 'WAITING_PSYCHOLOGIST' && (t.chatPage?.waitingPsychologist || (lang === 'kk' ? 'Психологты күтудеміз...' : 'Ожидаем психолога...'))}
                {status === 'ACTIVE' && (t.chatPage?.psychologistConnected || (lang === 'kk' ? 'Психолог қосылды' : 'Психолог подключён'))}
              </span>
            </div>
          </div>
        </div>

        {status === 'BOT' && (
          <button
            id="btn-call-psychologist"
            onClick={callPsychologist}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:text-white shrink-0 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Phone className="w-4 h-4 text-rose-500" />
            <span className="hidden sm:inline">
              {t.chatPage?.callPsychologist || (lang === 'kk' ? 'Психологты шақыру' : 'Вызвать психолога')}
            </span>
          </button>
        )}
        {status === 'WAITING_PSYCHOLOGIST' && (
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs sm:text-sm font-medium shrink-0">
            <Clock size={16} />
            <span className="hidden sm:inline">{t.chatPage?.waiting || (lang === 'kk' ? 'Күтілуде...' : 'Ожидание...')}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4 mb-2 p-3.5 sm:p-6 shadow-sm">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/50 flex items-center justify-center mb-4 text-zinc-500 dark:text-zinc-400">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-zinc-900 dark:text-white font-semibold mb-2">
              {t.chatPage?.startConversation || (lang === 'kk' ? 'Сұхбатты бастаңыз' : 'Начни разговор')}
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xs">
              {t.chatPage?.startDesc || (lang === 'kk'
                ? 'Мен көмектесуге дайынмын. Мазасыздық, стресс, оқу немесе қарым-қатынас туралы сұраңыз.'
                : 'Я здесь, чтобы помочь. Спроси о тревоге, стрессе, учёбе или отношениях.')}
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender_role === 'STUDENT' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.sender_role === 'STUDENT'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 font-bold text-xs'
                : msg.sender_role === 'PSYCHOLOGIST'
                ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold text-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}>
              {msg.sender_role === 'STUDENT' ? (
                <User size={14} />
              ) : msg.sender_role === 'PSYCHOLOGIST' ? (
                <span>П</span>
              ) : (
                <LogoIcon className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
              )}
            </div>
            <div className={`max-w-[85%] sm:max-w-[75%] ${msg.sender_role === 'STUDENT' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              {msg.sender_role === 'PSYCHOLOGIST' && (
                <span className="text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold pl-1">
                  Психолог
                </span>
              )}
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.sender_role === 'STUDENT'
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-tr-sm shadow-sm font-medium'
                  : msg.sender_role === 'PSYCHOLOGIST'
                  ? 'bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-100 rounded-tl-sm shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-zinc-900 dark:text-zinc-100 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">{formatTime(msg.created_at)}</span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-surface-muted border border-surface-border flex items-center justify-center">
              <LogoIcon className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="bg-surface border border-surface-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Action Chips */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 shrink-0 animate-fade-in">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickAction(action)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-300 border border-brand-500/20 active:scale-95 transition-all shadow-sm"
            >
              <Calendar size={13} />
              <span>{action}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Form flush with bottom */}
      <form onSubmit={sendMessage} className="shrink-0">
        <div className="flex w-full items-end gap-2">
          <textarea
            id="chat-input"
            className="flex-1 min-w-0 resize-none rounded-xl border border-zinc-200 bg-white p-2.5 sm:p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all leading-relaxed"
            rows={1}
            placeholder={t.chatPage?.inputPlaceholder || (lang === 'kk' ? 'Хабарлама жазыңыз...' : 'Напиши сообщение...')}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            disabled={sending}
          />
          <button
            id="btn-send-chat"
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 p-2.5 sm:p-3 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center shadow-xs"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );

}
