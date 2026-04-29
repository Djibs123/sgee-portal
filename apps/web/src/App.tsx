import { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { GeneralPage } from './pages/GeneralPage';
import { CursusPage } from './pages/CursusPage';
import { PaiementsPage } from './pages/PaiementsPage';
import { RibPage } from './pages/RibPage';
import { DocumentsPage } from './pages/DocumentsPage';
import type { PageId } from './types';

function App() {
  const [page, setPage] = useState<PageId>('dashboard');

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage onNav={setPage} />;
      case 'general':   return <GeneralPage />;
      case 'cursus':    return <CursusPage />;
      case 'paiements': return <PaiementsPage />;
      case 'rib':       return <RibPage />;
      case 'documents': return <DocumentsPage />;
    }
  };

  return (
    <>
      <div className="flag-strip"><span /><span /><span /></div>
      <Header />
      <div className="layout">
        <Sidebar active={page} onNav={setPage} />
        <main className="main">
          {renderPage()}
        </main>
      </div>
    </>
  );
}

export default App;
