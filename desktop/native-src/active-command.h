// NS2 Desktop adapter for its authenticated, nine-argument bootstrap.
// The private record is produced by the live UI host, never by a browser input.
static int load_active_start(char *destination, size_t capacity) {
    const char *file = getenv("NS2_ACTIVE_COMMAND_FILE");
    if (!file || !*file) return -1;
    FILE *stream = fopen(file, "r");
    if (!stream) return -1;
    char pidline[40];
    if (!fgets(pidline, sizeof(pidline), stream) || !fgets(destination, (int)capacity, stream)) {
        fclose(stream); return -1;
    }
    int extra = fgetc(stream); fclose(stream);
    char *end = NULL; errno = 0;
    long pid = strtol(pidline, &end, 10);
    if (extra != EOF || errno || end == pidline || strcmp(end, "\n") || pid <= 1 ||
        pid > 2147483647L || (kill((pid_t)pid, 0) != 0 && errno != EPERM)) return -1;
    size_t n = strcspn(destination, "\r\n");
    if (destination[n] != '\n' || destination[n+1] != '\0') return -1;
    destination[n] = '\0';
    if (strncmp(destination, "V=START(", 8)) return -1;
    const char *p = destination + 8;
    for (int i = 0; i < 9; i++) {
        if (*p < '0' || *p > '9') return -1;
        errno = 0;
        unsigned long long value = strtoull(p, &end, 10);
        if (errno == ERANGE || end == p || (i == 0 && value != 39380) ||
            (i >= 1 && i <= 4 && value > 255) || (i >= 5 && value > 281474976710655ULL) ||
            (i < 8 && *end != ',') || (i == 8 && *end != ')')) return -1;
        p = end + 1;
    }
    return *p == '\0' ? 0 : -1;
}
