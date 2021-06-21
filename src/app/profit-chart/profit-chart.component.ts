import { AfterViewInit, Component, ElementRef, ViewChild, Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import ApexCharts from 'apexcharts/dist/apexcharts.common.js';
import { ChartService } from '../chart.service';
import { BinanceKline } from '../interfaces';

@Component({
  selector: 'profit-chart',
  templateUrl: './profit-chart.component.html',
  styleUrls: ['./profit-chart.component.scss']
})
export class ProfitChartComponent implements AfterViewInit {
  @ViewChild('apexChart')
  public apexChart: ElementRef;

  @Input()
  public commission: number;

  @Input()
  public title: string;

  public stats: any;
  private options: any;

  constructor(
    private http: HttpClient,
    private chartService: ChartService
  ) {
  }

  ngAfterViewInit(): void {
    this.initChart();

    this.chartService.klinesSubject.subscribe((res: any) => {
      this.postBacktest(res);
    });
  }

  private initChart(): void {
    this.options = {
      series: [{
        name: this.title,
        data: []
      }],
      chart: {
        height: 250,
        type: 'line',
        animations: {
          enabled: false
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight'
      },
      title: {
        text: this.title,
        align: 'left'
      },
      tooltip: {
        x: {
          formatter: (val) => {
            const d = new Date(val);
            return d.toLocaleTimeString();
          }
        }
      },
      xaxis: {
        labels: {
          datetimeUTC: false
        },
        type: 'datetime'
      },
      yaxis: {
        labels: {
          formatter: (y) => {
            return y.toFixed(0) + '%';
          }
        }
      }
    };
  }

  private postBacktest(klines: Array<BinanceKline>): void {
    const query = {
      commission: this.commission,
      type: this.chartService.strategyType
    };

    const baseUrl = this.chartService.baseUrl + '/backtest';
    const url = this.chartService.createUrl(baseUrl, query);

    this.http.post(url, klines).subscribe((res: any) => {
      const mappedPercentages = res.map(kline => {
        return {
          x: kline.times.open,
          y: kline.percentProfit
        };
      });

      this.options.series[0].data = mappedPercentages;
      this.renderChart();
      this.calcStats(res, mappedPercentages);
    });
  }

  private renderChart() {
    const chart = new ApexCharts(this.apexChart.nativeElement, this.options);
    chart.render();
  }

  private calcStats(klines: Array<BinanceKline>, percentages: Array<any>): void {
    const tradesCount = klines.filter(kline => kline.signal !== undefined).length;

    this.stats = {
      trades: tradesCount,
      profit: (percentages[percentages.length - 1].y).toFixed(2) + '%',
      ppt: (percentages[percentages.length - 1].y / tradesCount).toFixed(3) + '%',
      maxDrawback: this.calcMaxDrawback(percentages).toFixed(2) + '%'
    };
  }

  private calcMaxDrawback(klines: Array<any>): number {
    let high = 0;
    let maxDrawback = 0;

    klines.forEach(kline => {
      if (kline.y < high) {
        if (high - kline.y > maxDrawback) {
          maxDrawback = high - kline.y;
        }
      } else {
        high = kline.y;
      }
    });

    return maxDrawback;
  }

}
