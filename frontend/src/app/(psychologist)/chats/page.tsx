'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MessageSquare, Clock, User, ChevronRight, Send, BellRing, CheckCircle2, Bot } from 'lucide-react';

import { LogoIcon } from '@/components/ui/logo-icon';
import { chatApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Dialog, ChatMessage } from '@/types/chat';
import { formatDate, formatTime } from '@/lib/utils';
import { playNotificationChime, playEmergencyAlertSound } from '@/lib/sound-alerts';
import { useLanguage } from '@/context/language-context';

export default function ChatsPage() {
  const { lang } = useLanguage();
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [selected, setSelected] = useState<Dialog | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyInput, setReplyInput] = useState('');
  const [sending, setSending] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchWaitingDialogs = useCallback(async () => {
    try {
      const r = await chatApi.getWaiting();
      setDialogs(r.data || []);
    } catch (err) {
      console.error('Failed to fetch waiting dialogs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── 1. Load initial waiting dialogs ─────────────────────────────────────────
  useEffect(() => {
    fetchWaitingDialogs();
  }, [fetchWaitingDialogs]);

  // ─── 2. Realtime subscription for Dialogs (Queue of Waiting Students) ────────
  useEffect(() => {
    const dialogsChannel = supabase
      .channel('psychologist-dialogs-queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dialogs',
        },
        (payload) => {
          const updatedDialog = payload.new as Dialog;
          if (!updatedDialog) return;

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            if (updatedDialog.status === 'WAITING_PSYCHOLOGIST') {
              playEmergencyAlertSound();
              setHasNewAlert(true);
              setDialogs((prev) => {
                const exists = prev.some((d) => d.id === updatedDialog.id);
                if (exists) {
                  return prev.map((d) => (d.id === updatedDialog.id ? { ...d, ...updatedDialog } : d));
                }
                return [updatedDialog, ...prev];
              });
            } else {
              // Dialog was answered, closed, or moved to another status
              setDialogs((prev) => prev.filter((d) => d.id !== updatedDialog.id));
              setSelected((curr) => {
                if (curr && curr.id === updatedDialog.id) {
                  return { ...curr, status: updatedDialog.status };
                }
                return curr;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldDialog = payload.old as Dialog;
            if (oldDialog?.id) {
              setDialogs((prev) => prev.filter((d) => d.id !== oldDialog.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dialogsChannel);
    };
  }, []);

  // ─── 3. Realtime subscription for Messages in the Selected Dialog ────────────
  useEffect(() => {
    if (!selected?.id) return;

    const messagesChannel = supabase
      .channel(`psychologist-dialog-messages:${selected.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `dialog_id=eq.${selected.id}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (!newMsg) return;

          if (newMsg.sender_role === 'STUDENT') {
            playNotificationChime();
          }

          setSelected((prev) => {
            if (!prev || prev.id !== newMsg.dialog_id) return prev;
            const currentMsgs = prev.messages || [];

            // Avoid duplicate
            if (currentMsgs.some((m) => m.id === newMsg.id)) return prev;

            // Replace optimistic message if exists
            const tempIndex = currentMsgs.findIndex(
              (m) => m.id.startsWith('temp_') && m.content === newMsg.content && m.sender_role === newMsg.sender_role
            );
            if (tempIndex !== -1) {
              const updatedMsgs = [...currentMsgs];
              updatedMsgs[tempIndex] = newMsg;
              return { ...prev, messages: updatedMsgs };
            }

            return {
              ...prev,
              messages: [...currentMsgs, newMsg],
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [selected?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  async function openDialog(dialog: Dialog) {
    setSelected(dialog);
    setHasNewAlert(false);
    try {
      // 1. First fetch strictly by dialog_id without users join
      const res = await chatApi.getMessages(dialog.id).catch(() => chatApi.getHistory(dialog.student_id));
      const msgs: ChatMessage[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.messages || []);
      setSelected({ ...dialog, messages: msgs });
    } catch (err) {
      console.error('Failed to load full chat history:', err);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !replyInput.trim() || sending) return;

    const content = replyInput.trim();
    setReplyInput('');
    setSending(true);

    // Optimistic UI message
    const tempMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      dialog_id: selected.id,
      sender_role: 'PSYCHOLOGIST',
      content,
      created_at: new Date().toISOString(),
    };

    setSelected((prev) => (prev ? { ...prev, messages: [...(prev.messages || []), tempMessage] } : null));

    try {
      await chatApi.reply(selected.id, content);
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  }

  const isAnonymous =
    !selected ||
    selected.student_id === '00000000-0000-0000-0000-000000000000' ||
    selected.student_id === 'anonymous' ||
    Boolean((selected as any).is_anonymous);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">
            {lang === 'kk' ? 'Оқушылар өтініштері' : 'Обращения учеников'}
          </h1>
          <p className="section-subtitle">
            {lang === 'kk'
              ? 'Психолог жауабын күтіп тұрған диалогтар (нақты уақыт режимінде)'
              : 'Диалоги, ожидающие ответа психолога (в реальном времени)'}
          </p>
        </div>
        {hasNewAlert && (
          <div className="flex items-center gap-2 bg-risk-critical/15 border border-risk-critical/30 text-risk-critical px-3 py-1.5 rounded-full text-xs font-semibold animate-pulse">
            <BellRing size={14} />
            <span>{lang === 'kk' ? 'Жаңа шұғыл өтініш!' : 'Новое обращение!'}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List of Waiting Dialogs (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1 text-xs text-gray-400 font-medium">
            <span>{lang === 'kk' ? 'Күту кезегі' : 'Очередь ожидания'}</span>
            <span className="bg-surface-muted px-2 py-0.5 rounded-full">{dialogs.length}</span>
          </div>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-20" />
            ))
          ) : dialogs.length === 0 ? (
            /* Styled Empty State for Queue */
            <div className="card text-center !py-12 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-emerald-500 dark:text-emerald-400">
                <CheckCircle2 size={28} />
              </div>
              <p className="text-zinc-900 dark:text-white font-semibold text-sm">
                {lang === 'kk' ? 'Барлық өтініштер өңделді' : 'Все обращения обработаны'}
              </p>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1 max-w-[220px] mx-auto leading-relaxed">
                {lang === 'kk'
                  ? 'Оқушылардан жаңа сұраныстар келгенде мұнда автоматты түрде пайда болады'
                  : 'Новые запросы учеников появятся здесь автоматически в реальном времени'}
              </p>
            </div>
          ) : (
            dialogs.map((dialog) => {
              const isSelected = selected?.id === dialog.id;
              const isWaiting = dialog.status === 'WAITING_PSYCHOLOGIST';
              const isAnonDialog =
                dialog.student_id === '00000000-0000-0000-0000-000000000000' ||
                dialog.student_id === 'anonymous' ||
                Boolean((dialog as any).is_anonymous);

              return (
                <button
                  key={dialog.id}
                  onClick={() => openDialog(dialog)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 relative shadow-sm ${
                    isWaiting
                      ? 'ring-2 ring-rose-500/80 bg-rose-500/10 border-rose-500/50 animate-pulse'
                      : isSelected
                      ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-brand-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isWaiting ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/40' : 'bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400'
                      }`}>
                        <User size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-zinc-900 dark:text-white font-semibold text-sm flex items-center gap-2">
                          <span className="truncate">
                            {dialog.student_name || (isAnonDialog ? (lang === 'kk' ? 'Анонимді оқушы' : 'Анонимный ученик') : dialog.student_id)}
                          </span>
                          {isWaiting && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500 text-white shadow-sm shrink-0">
                              SOS
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <Clock size={11} className="shrink-0" />
                          <span className="truncate">{formatDate(dialog.created_at)} {formatTime(dialog.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isWaiting && (
                        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                      )}
                      <ChevronRight size={16} className="text-zinc-400" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Chat view & Reply console (8 cols) */}
        <div className="lg:col-span-8 card !p-0 flex flex-col h-[600px] overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm rounded-2xl">
          {!selected ? (
            /* Styled Empty State for Chat Selection */
            <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 shadow-sm">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-zinc-900 dark:text-white font-bold text-base mb-1">
                {lang === 'kk' ? 'Диалогты таңдаңыз' : 'Выберите диалог'}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm leading-relaxed">
                {lang === 'kk'
                  ? 'Оқушының сұрағымен танысып, онлайн кеңес беру үшін сол жақтағы тізімнен өтінішті таңдаңыз.'
                  : 'Выберите обращение из очереди слева для просмотра контекста и оперативного ответа ученику.'}
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-500/15 border border-brand-500/25 rounded-xl flex items-center justify-center text-brand-600 dark:text-brand-400">
                    <User size={18} />
                  </div>
                  <div>
                    <div className="text-zinc-900 dark:text-white font-semibold text-sm flex items-center gap-2">
                      <span>{selected.student_name || (isAnonymous ? (lang === 'kk' ? 'Анонимді оқушы' : 'Анонимный ученик') : selected.student_id)}</span>
                      {isAnonymous && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {lang === 'kk' ? 'Анонимді' : 'Аноним'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{lang === 'kk' ? 'Мәртебесі:' : 'Статус:'}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          selected.status === 'WAITING_PSYCHOLOGIST'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : selected.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {selected.status === 'WAITING_PSYCHOLOGIST'
                          ? (lang === 'kk' ? 'Психологты күтуде' : 'Ожидает психолога')
                          : selected.status === 'ACTIVE'
                          ? (lang === 'kk' ? 'Кеңес беру белсенді' : 'Консультация активна')
                          : selected.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages Flow */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-zinc-50/70 dark:bg-black/20">
                {/* Informational Banner for Anonymous Chats */}
                {isAnonymous && (
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg mb-4 text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700/60 shadow-sm">
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {lang === 'kk' ? 'Анонимді диалог.' : 'Анонимный диалог.'}
                    </span>{' '}
                    {lang === 'kk'
                      ? 'Төменде оқушының AI-ассистентпен алдын ала жазысқан тарихы көрсетілген.'
                      : 'Ниже показана предыстория переписки ученика с AI-ассистентом.'}
                  </div>
                )}

                {(!selected.messages || selected.messages.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8">
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                      {lang === 'kk' ? 'Бұл диалогта хабарламалар әзірге жоқ' : 'История диалога пуста'}
                    </p>
                  </div>
                ) : (
                  selected.messages.map((msg) => {
                    const isPsychologist = msg.sender_role === 'PSYCHOLOGIST' || (msg as any).sender_type === 'psychologist';
                    const isStudent = msg.sender_role === 'STUDENT' || (msg as any).sender_type === 'student';
                    const isBot = msg.sender_role === 'BOT' || (msg as any).sender_type === 'bot';

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${isPsychologist ? 'flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold ${
                            isPsychologist
                              ? 'bg-brand-500/25 text-brand-600 dark:text-brand-300 border border-brand-500/40'
                              : isStudent
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {isPsychologist ? (
                            'Вы'
                          ) : isStudent ? (
                            <User size={13} />
                          ) : (
                            <LogoIcon className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                          )}
                        </div>
                        <div
                          className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isPsychologist
                              ? 'bg-brand-500 text-white dark:bg-brand-600/30 dark:border dark:border-brand-500/40 dark:text-gray-100 rounded-tr-sm'
                              : isStudent
                              ? 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-tl-sm'
                              : 'bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/90 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 rounded-tl-sm'
                          }`}
                        >
                          {isBot && (
                            <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                              <Bot size={12} className="text-indigo-500 dark:text-indigo-400" />
                              <span>AISezim Ассистент</span>
                            </div>
                          )}
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                          <div className={`text-[10px] text-right mt-1 ${isPsychologist ? 'text-white/80 dark:text-zinc-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                            {formatTime(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-2">
                <input
                  type="text"
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder={lang === 'kk' ? 'Оқушыға жауап беру (кеңес беру)...' : 'Ответить ученику (консультация)...'}
                  className="input flex-1 !py-2 text-sm"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !replyInput.trim()}
                  className="btn-primary !py-2 !px-4 flex items-center gap-1.5 text-sm shadow-sm"
                >
                  <Send size={15} />
                  <span>{lang === 'kk' ? 'Жауап беру' : 'Ответить'}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

