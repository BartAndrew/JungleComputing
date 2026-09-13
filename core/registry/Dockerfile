FROM rust:1.86-bookworm AS builder
WORKDIR /workspace/registry
COPY registry/Cargo.toml ./
COPY registry/src ./src
COPY canopy ../canopy
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /workspace/registry/target/release/jungle-registry /usr/local/bin/jungle-registry
ENV RUST_LOG=info
EXPOSE 8080
CMD ["jungle-registry"]
