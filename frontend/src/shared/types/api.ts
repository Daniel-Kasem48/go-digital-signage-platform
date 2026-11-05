export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  limit: number;
  offset: number;
}

export interface DeviceDto {
  id: string;
  identifier?: string;
  name?: string;
  code?: string;
  active_channel_id?: string | null;
  orientation?: string;
  ip_address?: string | null;
  last_active_at?: string | null;
  created_at?: string;
}

export interface ChannelDto {
  id: string;
  name?: string;
  description?: string | null;
  published_at?: string | null;
  active?: boolean;
  created_at?: string;
}

export interface PlaylistDto {
  id: string;
  name?: string;
  layout_id?: string | null;
  created_at?: string;
}

export interface LayoutDto {
  id: string;
  name?: string;
  zones?: unknown;
  created_at?: string;
  updated_at?: string;
}

export interface ContentDto {
  id: string;
  name?: string;
  type?: string;
  content_type?: string;
  status?: string;
  file_path?: string;
  full_url?: string;
  created_at?: string;
}

export interface ChannelScheduleDto {
  id: string;
  start_datetime?: string;
  end_datetime?: string;
  channel_id?: string;
  playlist_id?: string;
  day?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PlaylistItemDto {
  id: string;
  order?: number;
  layout_position?: number;
  timestring?: string;
  is_active?: boolean;
  content_id?: string;
  playlist_id?: string;
  created_at?: string;
  updated_at?: string;
}
