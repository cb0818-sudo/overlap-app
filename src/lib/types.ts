export type ImageType = "upload" | "ai" | "none";

export type Room = {
  id: string;
  title: string | null;
  status: "lobby" | "swiping" | "revealed";
  host_client_id: string;
  matched_option_id: string | null;
  reveal_reason: "match" | "fallback" | "manual" | null;
  created_at: string;
  expires_at: string;
};

export type Participant = {
  id: string;
  room_id: string;
  client_id: string;
  display_name: string;
  is_host: boolean;
  joined_at: string;
};

export type OptionRow = {
  id: string;
  room_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_type: ImageType;
  created_by: string | null;
  created_at: string;
};

export type SwipeRow = {
  id: string;
  room_id: string;
  participant_id: string;
  option_id: string;
  direction: "like" | "skip";
  created_at: string;
};
