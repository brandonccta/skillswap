import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Message } from '../types';

/**
 * Subscribe to new messages for a given tradeId via Supabase Realtime.
 * Calls onNewMessage whenever a new INSERT arrives on the messages table.
 * Unsubscribes automatically on unmount.
 */
export function useRealtime(
  tradeId: string,
  onNewMessage: (msg: Message) => void
) {
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${tradeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `trade_id=eq.${tradeId}`,
        },
        (payload) => {
          onNewMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tradeId, onNewMessage]);
}
