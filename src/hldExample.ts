import { newDesign, uid, type ComponentKind, type Design } from "./model";

export const hldWalkthrough = [
  {
    title: "1 · Request path",
    names: [
      "Rider app",
      "Load balancer",
      "API gateway",
      "Ride service",
      "Matching service",
      "Redis",
      "Ride DB",
    ],
    text: "The app sends POST /rides with pickup and destination. The load balancer distributes traffic across gateway replicas; the gateway authenticates and routes. Ride service calls Matching service, which searches driver locations in Redis. Ride service persists the ride in SQL. A 201 response with ride_id returns along the same request path; you usually do not draw a separate response arrow.",
    input: "pickup, destination, rider_id",
    output: "201 { ride_id, status }",
  },
  {
    title: "2 · Events & pub/sub",
    names: [
      "Ride service",
      "Kafka · ride events",
      "Notification service",
      "Analytics consumer",
      "Trip history",
    ],
    text: "After committing a ride, Ride service publishes RideRequested. In production, an outbox plus relay can bridge the DB commit and event publication. Kafka is the pub/sub channel here: notification and analytics consumers use separate consumer groups so both receive the event. Replicas in the same group share partitions. Analytics writes a denormalized document to NoSQL. Consumers must handle duplicates.",
    input: "RideRequested { event_id, ride_id, rider_id }",
    output: "Independent notification and analytics processing",
  },
  {
    title: "3 · Jobs & storage",
    names: ["Scheduler", "Job queue", "Receipt worker", "Object storage"],
    text: "The scheduler periodically enqueues receipt/export jobs. Workers pull and acknowledge jobs after processing; retries can redeliver a job, so processing should be idempotent. A worker writes PDFs or exports to object storage. A job queue distributes work among workers; it does not imply that every worker receives every job.",
    input: "GenerateReceipt { job_id, ride_id }",
    output: "receipt object key / download URL",
  },
  {
    title: "4 · Payments & webhook",
    names: [
      "Ride service",
      "Payment service",
      "Payment DB",
      "Payment provider",
      "Webhook ingress",
      "Kafka · ride events",
    ],
    text: "Payment service requests a charge from an external provider. Later the provider initiates a new HTTPS request to the webhook ingress; this is a callback, not the original charge response. The ingress verifies the signature and routes the event to Payment service, which deduplicates it, persists payment state, and publishes PaymentCompleted. A dashed callback arrow means decoupled in time; the webhook delivery itself still uses HTTP request/response.",
    input: "charge request; signed payment.completed callback",
    output: "persisted payment status + PaymentCompleted event",
  },
  {
    title: "5 · Notifications",
    names: [
      "Kafka · ride events",
      "Notification service",
      "Push / SMS provider",
      "Rider app",
    ],
    text: "Notification service consumes ride/payment events and calls the push/SMS provider. The provider delivers a user-facing notification to the app. The notification is separate from the original API response and may arrive later. Retry transient failures and deduplicate notifications by event and recipient.",
    input: "RideRequested or PaymentCompleted",
    output: "Push or SMS to the rider",
  },
  {
    title: "6 · Driver location",
    names: [
      "Driver app",
      "Load balancer",
      "API gateway",
      "Location service",
      "Redis",
      "Matching service",
    ],
    text: "The driver app sends location updates through the same edge tier. Location service updates short-lived driver coordinates in Redis. Matching service reads nearby available drivers. Redis holds fast, temporary state here; the SQL database remains authoritative for rides.",
    input: "{ driver_id, lat, lng, timestamp }",
    output: "Nearby available driver IDs",
  },
];

export function createHldExample(): Design {
  const d = newDesign();
  d.title = "Design Uber · HLD example";
  d.subtitle =
    "Follow requests, events, jobs, and callbacks through a ride-booking system.";
  d.hldExample = true;
  d.sections.forEach((s) => {
    s.collapsed = s.kind !== "architecture";
  });
  const specs: [string, ComponentKind, string, number, number][] = [
    ["Rider app", "client", "Sends requests; receives push", 0, 0],
    ["Driver app", "client", "Publishes live location", 0, 210],
    ["Load balancer", "loadBalancer", "Distributes gateway traffic", 350, 0],
    ["API gateway", "gateway", "Auth, routing, rate limits", 700, 0],
    ["Ride service", "service", "Ride lifecycle · SQL owner", 1050, 0],
    ["Matching service", "service", "Find nearby drivers", 1400, 210],
    ["Location service", "service", "Ingest driver coordinates", 1050, 420],
    ["Redis", "cache", "Geo index · ephemeral state", 1750, 420],
    ["Ride DB", "database", "SQL · rides and outbox", 1400, -210],
    ["Kafka · ride events", "stream", "PUB/SUB · durable event log", 1750, 0],
    [
      "Notification service",
      "service",
      "Consumer group: notifications",
      2100,
      -210,
    ],
    ["Analytics consumer", "worker", "Consumer group: analytics", 2100, 210],
    ["Trip history", "database", "NoSQL · trip documents", 2450, 210],
    [
      "Push / SMS provider",
      "custom",
      "External notification delivery",
      2450,
      -210,
    ],
    [
      "Payment service",
      "service",
      "Charges · webhook deduplication",
      1050,
      -680,
    ],
    ["Payment DB", "database", "SQL · payments and event IDs", 1400, -890],
    ["Payment provider", "custom", "External payment processor", 1400, -680],
    [
      "Webhook ingress",
      "gateway",
      "Verify signatures; route callback",
      1750,
      -680,
    ],
    ["Scheduler", "scheduler", "Periodic receipt / export trigger", 0, 780],
    ["Job queue", "queue", "Work distribution · retry / ack", 350, 780],
    ["Receipt worker", "worker", "Idempotent PDF / export jobs", 700, 780],
    ["Object storage", "storage", "Receipt PDFs and exports", 1050, 780],
  ];
  d.architecture.nodes = specs.map(([name, kind, description, x, y]) => ({
    id: uid(),
    name,
    kind,
    description,
    position: { x, y },
  }));
  const node = (name: string) =>
    d.architecture.nodes.find((n) => n.name === name)!.id;
  const edges: [string, string, string, boolean?][] = [
    ["Rider app", "Load balancer", "HTTPS · POST /rides"],
    ["Driver app", "Load balancer", "HTTPS · location update"],
    ["Load balancer", "API gateway", "Forward request"],
    ["API gateway", "Ride service", "POST /rides → 201 ride_id"],
    ["API gateway", "Location service", "PUT /drivers/:id/location"],
    ["Ride service", "Matching service", "findDrivers(pickup) → IDs"],
    ["Matching service", "Redis", "GEOSEARCH → nearby drivers"],
    ["Location service", "Redis", "GEOADD · driver coordinates"],
    ["Ride service", "Ride DB", "INSERT ride + outbox → ride_id"],
    [
      "Ride service",
      "Kafka · ride events",
      "Publish RideRequested · via outbox",
      true,
    ],
    [
      "Kafka · ride events",
      "Notification service",
      "Subscribe · notifications group",
      true,
    ],
    [
      "Kafka · ride events",
      "Analytics consumer",
      "Subscribe · analytics group",
      true,
    ],
    ["Analytics consumer", "Trip history", "UPSERT trip document"],
    ["Notification service", "Push / SMS provider", "Send(recipient, message)"],
    ["Push / SMS provider", "Rider app", "Push / SMS delivery", true],
    ["Ride service", "Payment service", "Charge completed ride → payment_id"],
    ["Payment service", "Payment DB", "Persist status + deduplication key"],
    ["Payment service", "Payment provider", "POST /charges → charge_id"],
    [
      "Payment provider",
      "Webhook ingress",
      "HTTPS callback · payment.completed",
      true,
    ],
    ["Webhook ingress", "Payment service", "Verified callback → HTTP 2xx"],
    [
      "Payment service",
      "Kafka · ride events",
      "Publish PaymentCompleted",
      true,
    ],
    ["Scheduler", "Job queue", "Enqueue GenerateReceipt(job_id)", true],
    ["Job queue", "Receipt worker", "Pull job · process · acknowledge", true],
    ["Receipt worker", "Object storage", "PUT receipt.pdf → object key"],
    ["Receipt worker", "Ride service", "GET completed ride → receipt data"],
  ];
  d.architecture.edges = edges.map(
    ([source, target, label, async = false]) => ({
      id: uid(),
      source: node(source),
      target: node(target),
      label,
      async,
    }),
  );
  d.architecture.viewport = { x: 50, y: 220, zoom: 0.28 };
  d.discussionNotes =
    "REFERENCE EXAMPLE — introduce only the components your requirements justify. This is not a complete production design.\n\nDiagram conventions: boxes are responsibilities; arrows show the direction of a call, data movement, or event delivery. Labels describe the operation and payload. Solid = direct request/response; dashed = decoupled event/job/delivery. Responses normally travel back along the call path without an extra line.\n\n" +
    hldWalkthrough
      .map(
        (s) => `${s.title}\n${s.text}\nInput: ${s.input}\nOutput: ${s.output}`,
      )
      .join("\n\n") +
    "\n\nFollow-up discussions: availability and replication; authentication and authorization; idempotency; outbox and retries; dead-letter queues; cache expiry; ordering and partition keys; backpressure; webhook replay protection; observability.";
  return d;
}
