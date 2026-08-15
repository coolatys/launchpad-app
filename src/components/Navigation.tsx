'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  Search,
  Briefcase,
  FileText,
  Menu,
  X,
  Compass,
  MessageSquarePlus,
  LogOut,
  LogIn,
  Bell,
} from 'lucide-react';
import FeedbackModal from '@/components/FeedbackModal';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabaseClient';

export default function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin, signOut, hasCompletedProfile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    // 1. Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          const unread = data.notifications?.filter((n: any) => !n.read_at).length || 0;
          setUnreadCount(unread);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchUnreadCount();

    // 2. Setup Realtime subscription
    const subscription = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.read_at && !payload.old.read_at) {
             setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const isUnauthenticated = !user || pathname === '/login' || pathname.startsWith('/admin');
  const isPendingOnboarding = user && !hasCompletedProfile;

  if (isUnauthenticated || isPendingOnboarding) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Profile', href: '/profile', icon: User },
    { name: 'Opportunities', href: '/opportunities', icon: Compass },
    { name: 'Applications', href: '/applications', icon: Briefcase },
    ...(isAdmin ? [{ name: 'Tester Feedback', href: '/feedback', icon: MessageSquarePlus }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-navy text-white z-20 shadow-xl border-r border-navy-dark">
        <div className="flex items-center justify-between h-16 px-6 bg-navy-dark border-b border-slate-700/50">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="bg-gold p-1.5 rounded-lg text-navy-dark transform group-hover:rotate-12 transition-transform duration-300">
              <Compass className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-wider text-white">
              LAUNCH<span className="text-gold">PAD</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-gold text-navy-dark shadow-md shadow-gold/20 font-semibold'
                    : 'text-slate-300 hover:bg-navy-light hover:text-white'
                }`}
              >
                <Icon
                  className={`mr-3 h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'text-navy-dark' : 'text-slate-400 group-hover:text-white group-hover:scale-110'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-slate-700/50 mt-4">
            <button
              onClick={() => setFeedbackOpen(true)}
              className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 hover:text-amber-200 border border-amber-400/30 transition-all duration-200 cursor-pointer"
            >
              <MessageSquarePlus className="mr-3 h-5 w-5 text-amber-400" />
              Give Feedback
            </button>
          </div>
        </nav>

        {/* User Account / Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-navy-dark">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold flex items-center justify-center text-gold font-bold text-xs uppercase shrink-0">
                  {user.email?.charAt(0) || 'U'}
                </div>
                <div className="text-xs truncate">
                  <p className="font-semibold text-slate-200 truncate">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
                  <p className="text-slate-400 text-[10px] truncate">{isAdmin ? 'Admin' : 'Tester'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <Link
                  href="/opportunities"
                  title="Notifications"
                  onClick={async () => {
                    if (unreadCount > 0) {
                      setUnreadCount(0);
                      fetch('/api/notifications', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ markAllRead: true, userId: user.id }),
                      }).catch(console.error);
                    }
                  }}
                  className="relative p-1.5 text-slate-400 hover:text-gold hover:bg-gold/10 rounded-lg transition"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 border-2 border-navy-dark rounded-full animate-pulse" />
                  )}
                </Link>
                <button
                  onClick={() => signOut()}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-navy hover:bg-navy-light text-white text-xs font-semibold rounded-xl border border-slate-600 transition"
            >
              <LogIn className="w-4 h-4 text-gold" />
              <span>Sign In / Sign Up</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="flex flex-col flex-1 md:pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200 md:hidden shadow-sm">
          <Link href="/" className="flex items-center space-x-3">
            <div className="bg-gold p-1.5 rounded-lg text-navy-dark">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold tracking-wider text-navy">
              LAUNCH<span className="text-gold">PAD</span>
            </span>
          </Link>
          <div className="flex items-center space-x-2">
            <Link
              href="/opportunities"
              title="Notifications"
              onClick={async () => {
                if (unreadCount > 0) {
                  setUnreadCount(0);
                  fetch('/api/notifications', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ markAllRead: true, userId: user.id }),
                  }).catch(console.error);
                }
              }}
              className="relative p-2 text-slate-600 hover:text-gold rounded-lg transition"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full animate-pulse" />
              )}
            </Link>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-semibold flex items-center gap-1 border border-amber-200"
            >
              <MessageSquarePlus className="w-4 h-4 text-amber-500" />
              Feedback
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-600 hover:text-navy rounded-lg focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />

            <nav className="fixed inset-y-0 right-0 w-64 max-w-xs bg-navy text-white flex flex-col shadow-2xl z-50">
              <div className="flex items-center justify-between h-16 px-6 bg-navy-dark border-b border-slate-700/50">
                <span className="text-lg font-bold tracking-wider">
                  LAUNCH<span className="text-gold">PAD</span>
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                        isActive ? 'bg-gold text-navy-dark font-semibold' : 'text-slate-300 hover:bg-navy-light hover:text-white'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}

                <div className="pt-4 border-t border-slate-700/50 mt-4">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setFeedbackOpen(true);
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl text-amber-300 bg-amber-400/10 border border-amber-400/30"
                  >
                    <MessageSquarePlus className="mr-3 h-5 w-5 text-amber-400" />
                    Give Feedback
                  </button>
                </div>
              </div>

              <div className="p-4 border-t border-slate-700/50 bg-navy-dark">
                {user ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate">{user.email}</span>
                    <button onClick={() => signOut()} className="text-rose-400 font-semibold">Sign Out</button>
                  </div>
                ) : (
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-center text-xs font-semibold text-gold">
                    Sign In / Sign Up
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
