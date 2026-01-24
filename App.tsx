import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RelatedPapers from './pages/RelatedPapers';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/related-papers" element={<RelatedPapers />} />
    </Routes>
  );
}
