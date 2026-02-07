import { Injectable, Logger } from '@nestjs/common';
import * as si from 'systeminformation';
import * as pkg from '../../package.json';

@Injectable()
export class SystemInfoService {
  private readonly logger = new Logger(SystemInfoService.name);

  async getSystemStatus() {
    try {
      const currentLoad = await si.currentLoad();
      const [cpu, mem, osInfo, time] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.osInfo(),
        si.time(),
      ]);

      const temp = await si.cpuTemperature();

      return {
        botVersion: pkg.version,
        osInfo: {
          platform: osInfo.platform,
          distro: osInfo.distro,
          release: osInfo.release,
          arch: osInfo.arch,
        },
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          speed: cpu.speed,
          cores: cpu.cores,
          load: currentLoad.currentLoad.toFixed(2),
          temp: temp.main ? `${temp.main}°C` : 'N/A',
        },
        memory: {
          total: this.formatBytes(mem.total),
          free: this.formatBytes(mem.free),
          used: this.formatBytes(mem.used),
          active: this.formatBytes(mem.active),
          available: this.formatBytes(mem.available),
        },
        uptime: this.formatUptime(time.uptime),
        botUptime: this.formatUptime(process.uptime()),
      };
    } catch (e) {
      this.logger.error('Failed to get system status', e.stack);
      throw e;
    }
  }

  private formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  private formatUptime(seconds: number) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
  }
}
