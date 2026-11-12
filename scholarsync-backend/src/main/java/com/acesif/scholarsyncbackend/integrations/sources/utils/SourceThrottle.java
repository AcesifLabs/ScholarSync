package com.acesif.scholarsyncbackend.integrations.sources.utils;

import com.acesif.scholarsyncbackend.commons.exceptions.UpstreamException;

import java.time.Duration;
import java.util.concurrent.Semaphore;
import java.util.function.Supplier;

/** Spaces calls to one source at least {@code interval} apart and caps how many run at once. */
public final class SourceThrottle {

  private final String service;
  private final long intervalNanos;
  private final Semaphore permits;
  private long nextSlot = System.nanoTime();

  public SourceThrottle(String service, Duration interval, int maxConcurrent) {
    this.service = service;
    this.intervalNanos = interval.toNanos();
    this.permits = new Semaphore(maxConcurrent, true);
  }

  /** True while throttling is on and every permit is taken, so a new call would queue behind the ones running. */
  public boolean busy() {
    return intervalNanos > 0 && permits.availablePermits() == 0;
  }

  public <T> T call(Supplier<T> request) {
    try {
      permits.acquire();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw UpstreamException.rateLimited(service);
    }
    try {
      long slot;
      long wait;
      synchronized (this) {
        long now = System.nanoTime();
        slot = Math.max(now, nextSlot);
        nextSlot = slot + intervalNanos;
        wait = slot - now;
      }
      if (wait > 0) {
        try {
          Thread.sleep(Duration.ofNanos(wait));
        } catch (InterruptedException e) {
          // Cancelled before the request went out: hand the slot back unless a later caller already queued behind it
          synchronized (this) {
            if (nextSlot == slot + intervalNanos) nextSlot = slot;
          }
          throw e;
        }
      }
      return request.get();
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw UpstreamException.rateLimited(service);
    } finally {
      permits.release();
    }
  }
}
