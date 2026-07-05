"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getClientId } from "@/lib/clientId";
import type { Room, Participant, OptionRow, SwipeRow } from "@/lib/types";

export type RoomState = {
  loading: boolean;
  notFound: boolean;
  room: Room | null;
  participants: Participant[];
  options: OptionRow[];
  swipes: SwipeRow[];
  myParticipant: Participant | null;
};

export function useRoomState(code: string): RoomState {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [options, setOptions] = useState<OptionRow[]>([]);
  const [swipes, setSwipes] = useState<SwipeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data: roomRow }, { data: participantRows }, { data: optionRows }, { data: swipeRows }] =
        await Promise.all([
          supabase.from("rooms").select("*").eq("id", code).maybeSingle(),
          supabase
            .from("participants")
            .select("*")
            .eq("room_id", code)
            .order("joined_at", { ascending: true }),
          supabase
            .from("options")
            .select("*")
            .eq("room_id", code)
            .order("created_at", { ascending: true }),
          supabase.from("swipes").select("*").eq("room_id", code),
        ]);

      if (cancelled) return;

      if (!roomRow) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setRoom(roomRow as Room);
      setParticipants((participantRows ?? []) as Participant[]);
      setOptions((optionRows ?? []) as OptionRow[]);
      setSwipes((swipeRows ?? []) as SwipeRow[]);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`room:${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${code}` },
        (payload) => {
          if (payload.eventType === "UPDATE") setRoom(payload.new as Room);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "participants", filter: `room_id=eq.${code}` },
        (payload) => {
          const row = payload.new as Participant;
          setParticipants((prev) => (prev.some((p) => p.id === row.id) ? prev : [...prev, row]));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "participants" },
        (payload) => {
          const row = payload.old as Partial<Participant>;
          if (!row.id) return;
          setParticipants((prev) => prev.filter((p) => p.id !== row.id));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "options", filter: `room_id=eq.${code}` },
        (payload) => {
          const row = payload.new as OptionRow;
          setOptions((prev) => (prev.some((o) => o.id === row.id) ? prev : [...prev, row]));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "options" },
        (payload) => {
          const row = payload.old as Partial<OptionRow>;
          if (!row.id) return;
          setOptions((prev) => prev.filter((o) => o.id !== row.id));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "swipes", filter: `room_id=eq.${code}` },
        (payload) => {
          const row = payload.new as SwipeRow;
          setSwipes((prev) => (prev.some((s) => s.id === row.id) ? prev : [...prev, row]));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "swipes" },
        (payload) => {
          const row = payload.old as Partial<SwipeRow>;
          if (!row.id) return;
          setSwipes((prev) => prev.filter((s) => s.id !== row.id));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [code]);

  const clientId = getClientId();
  const myParticipant = participants.find((p) => p.client_id === clientId) ?? null;

  return { loading, notFound, room, participants, options, swipes, myParticipant };
}
