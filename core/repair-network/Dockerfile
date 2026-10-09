FROM rust:1-bookworm AS builder
WORKDIR /workspace/repair-network
COPY repair-network/Cargo.toml ./
COPY repair-network/src ./src
COPY repair-network/index.html ./index.html
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /workspace/repair-network/target/release/jungle-repair-network /usr/local/bin/jungle-repair-network
USER 10001:10001
ENV RUST_LOG=info
EXPOSE 8081
CMD ["jungle-repair-network"]
