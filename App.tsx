import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RelatedPapers from './pages/RelatedPapers';
import PaperViewer from './pages/PaperViewer';
import SearchResults from './pages/SearchResults';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<SearchResults />} />
      <Route path="/related-papers" element={<RelatedPapers />} />
      <Route path="/paper/:id" element={<PaperViewer />} />
    </Routes>
  );
}
