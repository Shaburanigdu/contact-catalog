import { useState, useCallback } from 'react'
import { api } from '@/lib/api-client';

interface ContactTag {
  tag: {
    id: string;
    name: string;
    color: string;
  }
}

interface Contact {
  id: string
  first_name: string
  last_name?: string
  nickname?: string
  email?: string
  phone?: string
  city?: string
  country?: string
  company?: string
  job_title?: string
  relationship_type?: string
  relationship_level?: number
  trust_level?: number
  avatar_url?: string
  date_of_birth?: string
  last_interaction_date?: string
  total_interactions: number
  created_at: string
  updated_at: string
  contact_tags?: ContactTag[]
  tags?: Array<{ id: string; name: string; color: string }>
  user_id?: string 
}

interface ContactFormData {
  first_name: string
  last_name?: string
  middle_name?: string
  nickname?: string
  email?: string
  phone?: string
  phone_secondary?: string
  website?: string
  gender?: string
  date_of_birth?: string
  country?: string
  city?: string
  address?: string
  postal_code?: string
  company?: string
  job_title?: string
  department?: string
  relationship_type?: string
  relationship_level?: number
  trust_level?: number
  how_we_met?: string
  met_date?: string
  met_location?: string
  personal_notes?: string
  interests?: any
  important_facts?: any
  avatar_url?: string
  tags?: string[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface ContactsResponse {
  contacts: Contact[]
  pagination: Pagination
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export function useContacts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    country?: string;
    relationship_type?: string;
    tag?: string;
    has_upcoming_events?: boolean;
    last_interaction_days?: number;
  }): Promise<ContactsResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.search) queryParams.set('search', params.search);
      if (params?.city) queryParams.set('city', params.city);
      if (params?.country) queryParams.set('country', params.country);
      if (params?.relationship_type) queryParams.set('relationship_type', params.relationship_type);
      if (params?.tag) queryParams.set('tag', params.tag);
      if (params?.has_upcoming_events) queryParams.set('has_upcoming_events', 'true');
      if (params?.last_interaction_days) queryParams.set('last_interaction_days', params.last_interaction_days.toString());

      const result = await api.get<{ success: boolean; data?: ContactsResponse; error?: string }>(
        `/api/contacts?${queryParams}`
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch contacts');
      }

      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContact = useCallback(async (id: string): Promise<Contact | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.get<{ success: boolean; data?: Contact; error?: string }>(
        `/api/contacts/${id}`
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch contact');
      }

      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createContact = useCallback(async (data: ContactFormData): Promise<Contact | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.post<{ success: boolean; data?: Contact; error?: string }>(
        '/api/contacts',
        data
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create contact');
      }

      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateContact = useCallback(async (id: string, data: Partial<ContactFormData>): Promise<Contact | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.put<{ success: boolean; data?: Contact; error?: string }>(
        `/api/contacts/${id}`,
        data
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update contact');
      }

      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.delete<{ success: boolean; error?: string }>(
        `/api/contacts/${id}`
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete contact');
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.get<{ success: boolean; data?: any; error?: string }>(
        '/api/contacts/stats'
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch stats');
      }

      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Новые методы для работы с корзиной
  const fetchTrashContacts = useCallback(async (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ContactsResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.set('page', params.page.toString());
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.search) queryParams.set('search', params.search);

      const result = await api.get<{ success: boolean; data?: ContactsResponse; error?: string }>(
        `/api/contacts/trash?${queryParams}`
      );

      if (!result.success) throw new Error(result.error || 'Failed to fetch trash');
      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const restoreContact = useCallback(async (id: string): Promise<Contact | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<{ success: boolean; data?: Contact; error?: string }>(
        `/api/contacts/${id}/restore`,
        {}
      );
      if (!result.success) throw new Error(result.error || 'Failed to restore');
      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const hardDeleteContact = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.delete<{ success: boolean; error?: string }>(
        `/api/contacts/${id}/hard`
      );
      if (!result.success) throw new Error(result.error || 'Failed to hard delete');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchContacts,
    fetchContact,
    createContact,
    updateContact,
    deleteContact,
    fetchStats,
    fetchTrashContacts,
    restoreContact,
    hardDeleteContact,
  };
}