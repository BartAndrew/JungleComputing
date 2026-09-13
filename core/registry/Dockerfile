FROM rust:1.86-bookworm AS builder
WORKDIR /app
COPY Cargo.toml ./
COPY src ./src
COPY ../canopy /canopy
RUN mkdir -p canopy && cp /canopy/index.html canopy/index.html
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/jungle-registry /usr/local/bin/jungle-registry
ENV RUST_LOG=info
EXPOSE 8080
CMD ["jungle-registry"]
