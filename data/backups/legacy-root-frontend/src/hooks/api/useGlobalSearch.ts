// src/hooks/useGlobalSearch.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function useGlobalSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    // Navigate to global search results page
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);

    // Optional: Clear query after search
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setSearchQuery('');
    }
  };

  return {
    searchQuery,
    setSearchQuery,
    handleSearch,
    handleKeyDown,
  };
}
