# ============================================================================
# Simple Web Server Makefile
# Builds both C and C++ versions of the educational web server
# ============================================================================

# Compiler settings
CC = clang
CFLAGS = -std=c17 -O2 -Wall -Wextra -pedantic

# CXX = clang++
# CXXFLAGS = -std=c++20 -O2 -Wall -Wextra -pedantic

# Output directory
TARGET_DIR = target

# Source files
C_SOURCE = server.c
# CPP_SOURCE = server.cpp

# Output binaries
C_TARGET = $(TARGET_DIR)/server
# CPP_TARGET = $(TARGET_DIR)/server_cpp

# ============================================================================
# Build Targets
# ============================================================================

# Default target: build both servers
all: $(C_TARGET)
# all: $(C_TARGET) $(CPP_TARGET)
	@echo ""
	@echo "Build complete"
	@echo ""
	@echo "Run the C version:"
	@echo "  ./$(C_TARGET)"
# 	@echo ""
# 	@echo "Run the C++ version:"
# 	@echo "  ./$(CPP_TARGET)"
	@echo ""

# Create target directory if it doesn't exist
$(TARGET_DIR):
	@mkdir -p $(TARGET_DIR)
	@echo "Created target directory"

# Build C version
$(C_TARGET): $(C_SOURCE) | $(TARGET_DIR)
	@echo "Compiling C version..."
	$(CC) $(CFLAGS) $(C_SOURCE) -o $(C_TARGET)
	@echo "C server built: $(C_TARGET)"

# # Build C++ version
# $(CPP_TARGET): $(CPP_SOURCE) | $(TARGET_DIR)
# 	@echo "Compiling C++ version..."
# 	$(CXX) $(CXXFLAGS) $(CPP_SOURCE) -o $(CPP_TARGET)
# 	@echo "C++ server built: $(CPP_TARGET)"

# Build only C version
c: $(C_TARGET)

# # Build only C++ version
# cpp: $(CPP_TARGET)

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(TARGET_DIR)
	@echo "Clean complete"

# Run the C version
run-c: $(C_TARGET)
	@echo "Starting C server on port 8080..."
	@echo ""
	./$(C_TARGET)

# # Run the C++ version
# run-cpp: $(CPP_TARGET)
# 	@echo "Starting C++ server on port 8080..."
# 	@echo ""
# 	./$(CPP_TARGET)

# Rebuild everything from scratch
rebuild: clean all

# Show help
help:
	@echo "Simple Web Server Build System"
	@echo ""
	@echo "Available targets:"
# 	@echo "  make          - Build both C and C++ versions (default)"
# 	@echo "  make all      - Build both versions"
	@echo "  make c        - Build only C version"
# 	@echo "  make cpp      - Build only C++ version"
	@echo "  make clean    - Remove all build artifacts"
	@echo "  make rebuild  - Clean and build everything"
	@echo "  make run-c    - Build and run C version"
# 	@echo "  make run-cpp  - Build and run C++ version"
	@echo "  make help     - Show this help message"
	@echo ""

# Phony targets (not actual files)
.PHONY: all c cpp clean run-c run-cpp rebuild help