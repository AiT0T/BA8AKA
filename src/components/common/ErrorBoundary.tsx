'use client';
import React from 'react';

type Props = { fallback: React.ReactNode; children: React.ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: any) { console.error('Heatmap error:', err); }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}
